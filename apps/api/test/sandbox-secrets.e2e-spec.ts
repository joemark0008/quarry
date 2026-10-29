import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AgentService } from '../src/agent/agent.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { SandboxSecretService } from '../src/sandbox/sandbox-secret.service.js';
import { createTestApp, resetDatabase, useTestDatabase } from './test-app.js';

const ORIGIN = 'http://localhost:3000';
const SECRET_VALUE = 'sk-live-0123456789abcdef';
const OTHER_USER_ID = 'sandbox-secrets-other-user';

const SUMMARY = 'id name description createdAt updatedAt';

/**
 * Settings → Agent → Sandbox secrets on Postgres through GraphQL (upstream tRPC `sandboxSecret.*` and
 * `services/sandbox-secret.service.ts`, which upstream only covers through the tool's mocked `resolve`).
 */
describe('sandbox secrets (e2e)', () => {
	let app: NestExpressApplication;
	let prisma: PrismaService;
	let cookie: string[] = [];
	let userId = '';
	let projectId = '';
	let secretId = '';

	beforeAll(async () => {
		const databaseUrl = useTestDatabase();
		process.env.QUARRY_PROJECTS_DIR = await mkdtemp(path.join(tmpdir(), 'quarry-projects-'));
		await resetDatabase(databaseUrl);
		app = await createTestApp();
		prisma = app.get(PrismaService);
		const res = await request(app.getHttpServer())
			.post('/api/auth/sign-up/email')
			.set('Origin', ORIGIN)
			.send({ name: 'Ada', email: 'ada@example.com', password: 'Sup3r-secret!' })
			.expect(200);
		cookie = [res.headers['set-cookie']].flat().filter(Boolean) as string[];
		userId = res.body.user.id;
		const project = await graphql('mutation { createProject(input: { name: "Sandbox" }) { id } }');
		projectId = project.body.data.createProject.id;
	});

	afterAll(async () => {
		await app?.close();
	});

	const graphql = (query: string, variables: Record<string, unknown> = {}) =>
		request(app.getHttpServer())
			.post('/graphql')
			.set('Cookie', cookie)
			.set(projectId ? { 'x-quarry-project-id': projectId } : {})
			.send({ query, variables });

	const setSecret = (input: Record<string, unknown>) =>
		graphql(`mutation ($input: SetSandboxSecretInput!) { setSandboxSecret(input: $input) { ${SUMMARY} } }`, {
			input,
		});

	const listSecrets = async () => (await graphql(`{ sandboxSecrets { ${SUMMARY} } }`)).body.data.sandboxSecrets;

	it('stores a secret encrypted and lists it without its value', async () => {
		const res = await setSecret({
			name: 'OPENWEATHER_API_KEY',
			value: SECRET_VALUE,
			description: '  API key for OpenWeather  ',
		});
		expect(res.body.errors).toBeUndefined();
		expect(res.body.data.setSandboxSecret).toMatchObject({
			name: 'OPENWEATHER_API_KEY',
			description: 'API key for OpenWeather',
		});
		secretId = res.body.data.setSandboxSecret.id;

		expect(await listSecrets()).toEqual([expect.objectContaining({ id: secretId, name: 'OPENWEATHER_API_KEY' })]);
		const stored = await prisma.sandboxSecret.findUniqueOrThrow({ where: { id: secretId } });
		expect(stored.encryptedValue).not.toContain(SECRET_VALUE);
	});

	it('replaces the value of a secret set again under the same name', async () => {
		const res = await setSecret({ name: 'OPENWEATHER_API_KEY', value: 'sk-live-rotated-value' });
		expect(res.body.data.setSandboxSecret).toMatchObject({ id: secretId, description: null });
		expect(await listSecrets()).toHaveLength(1);

		const resolved = await app.get(SandboxSecretService).resolve(userId, projectId);
		expect(resolved).toEqual([{ name: 'OPENWEATHER_API_KEY', value: 'sk-live-rotated-value' }]);
	});

	it.each([
		['a lowercase name', { name: 'api_key', value: SECRET_VALUE }, 'Use an environment variable name'],
		['a name starting with a digit', { name: '1KEY', value: SECRET_VALUE }, 'Use an environment variable name'],
		['a reserved name', { name: 'PATH', value: SECRET_VALUE }, 'reserved by the sandbox runtime'],
		['a reserved prefix', { name: 'LD_PRELOAD', value: SECRET_VALUE }, 'reserved by the sandbox runtime'],
		['a value that is too short', { name: 'SHORT', value: 'abc' }, 'at least 4 characters'],
		['a description that is too long', { name: 'LONG', value: SECRET_VALUE, description: 'x'.repeat(201) }, ''],
	])('refuses %s', async (_label, input, message) => {
		const res = await setSecret(input);
		expect(res.body.errors[0].extensions.code).toBe('BAD_REQUEST');
		expect(res.body.errors[0].message).toContain(message);
	});

	it('updates and clears the description', async () => {
		const update = (description: string | null) =>
			graphql(
				`mutation ($input: UpdateSandboxSecretDescriptionInput!) {
					updateSandboxSecretDescription(input: $input) { ${SUMMARY} }
				}`,
				{ input: { secretId, description } },
			);
		expect((await update(' Weather API ')).body.data.updateSandboxSecretDescription.description).toBe(
			'Weather API',
		);
		expect((await update('   ')).body.data.updateSandboxSecretDescription.description).toBeNull();
	});

	it("keeps each user's secrets to themselves", async () => {
		await prisma.user.create({ data: { id: OTHER_USER_ID, name: 'Other', email: 'other@example.com' } });
		const other = await prisma.sandboxSecret.create({
			data: { userId: OTHER_USER_ID, projectId, name: 'OTHER_TOKEN', encryptedValue: 'x.y.z' },
		});

		expect((await listSecrets()).map((secret: { name: string }) => secret.name)).toEqual(['OPENWEATHER_API_KEY']);
		const update = await graphql(
			'mutation ($input: UpdateSandboxSecretDescriptionInput!) { updateSandboxSecretDescription(input: $input) { id } }',
			{ input: { secretId: other.id, description: 'hijacked' } },
		);
		expect(update.body.errors[0].extensions.code).toBe('NOT_FOUND');
		const remove = await graphql('mutation ($id: ID!) { deleteSandboxSecret(secretId: $id) }', { id: other.id });
		expect(remove.body.errors[0].extensions.code).toBe('NOT_FOUND');
		expect(await prisma.sandboxSecret.findUnique({ where: { id: other.id } })).not.toBeNull();
	});

	it('lists definitions for the system prompt and hands values to the sandbox tool through the tool context', async () => {
		expect(await app.get(SandboxSecretService).safeListDefinitions(userId, projectId)).toEqual([
			{ name: 'OPENWEATHER_API_KEY', description: null },
		]);
		const context = await app
			.get(AgentService)
			.buildToolContext({ projectId, userId, chatId: 'chat-id', agentSettings: null });
		expect(await context.services.resolveSandboxSecrets(userId, projectId)).toEqual([
			{ name: 'OPENWEATHER_API_KEY', value: 'sk-live-rotated-value' },
		]);
	});

	it('deletes a secret, then reports it missing', async () => {
		const remove = () => graphql('mutation ($id: ID!) { deleteSandboxSecret(secretId: $id) }', { id: secretId });
		expect((await remove()).body.data.deleteSandboxSecret).toBe(true);
		expect((await remove()).body.errors[0].extensions.code).toBe('NOT_FOUND');
		expect(await listSecrets()).toEqual([]);
	});

	it('refuses viewers, like upstream `nonViewerProtectedProcedure`', async () => {
		await prisma.projectMember.update({
			where: { projectId_userId: { projectId, userId } },
			data: { role: 'viewer' },
		});
		const res = await graphql(`{ sandboxSecrets { ${SUMMARY} } }`);
		expect(res.body.errors[0].extensions.code).toBe('FORBIDDEN');
	});
});
