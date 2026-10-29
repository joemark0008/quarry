import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { inject } from 'vitest';

import type { ConfigService } from '../config/config.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ContextRecommendationRepository } from './context-recommendation.repository.js';

/**
 * Ports of upstream `context-recommendation-admin.queries.test.ts` and `context-recommendation-schema.test.ts`
 * (SQLite there, the e2e Postgres database here), plus the raw-SQL queries quarry rewrote for Prisma.
 */
let prisma: PrismaService;
let repository: ContextRecommendationRepository;

beforeAll(async () => {
	const config = { env: { DATABASE_URL: inject('testDatabaseUrl'), DB_SSL: false, DB_QUERY_LOGGING: false } };
	prisma = new PrismaService(config as unknown as ConfigService);
	await prisma.$connect();
	repository = new ContextRecommendationRepository(prisma);
});

afterAll(async () => {
	await prisma.$disconnect();
});

describe('getFirstProjectAdminUserId', () => {
	const PROJECT_IDS = ['cra-direct', 'cra-inherited', 'cra-solo'];
	const USER_IDS = ['cra-project-admin', 'cra-org-admin', 'cra-demoted-org-admin'];

	async function cleanup() {
		await prisma.projectMember.deleteMany({ where: { projectId: { in: PROJECT_IDS } } });
		await prisma.orgMember.deleteMany({ where: { orgId: 'cra-org' } });
		await prisma.project.deleteMany({ where: { id: { in: PROJECT_IDS } } });
		await prisma.organization.deleteMany({ where: { id: 'cra-org' } });
		await prisma.user.deleteMany({ where: { id: { in: USER_IDS } } });
	}

	beforeEach(async () => {
		await cleanup();
		await prisma.organization.create({ data: { id: 'cra-org', name: 'CRA', slug: 'cra-org' } });
		await prisma.project.createMany({
			data: [
				{ id: 'cra-direct', orgId: 'cra-org', name: 'CRA Direct', type: 'local', path: '/tmp/cra-direct' },
				{
					id: 'cra-inherited',
					orgId: 'cra-org',
					name: 'CRA Inherited',
					type: 'local',
					path: '/tmp/cra-inherited',
				},
				{ id: 'cra-solo', orgId: null, name: 'CRA Solo', type: 'local', path: '/tmp/cra-solo' },
			],
		});
		await prisma.user.createMany({
			data: USER_IDS.map((id) => ({ id, name: id, email: `${id}@example.com` })),
		});
		await prisma.orgMember.createMany({
			data: [
				{ orgId: 'cra-org', userId: 'cra-demoted-org-admin', role: 'admin', createdAt: new Date('2026-01-01') },
				{ orgId: 'cra-org', userId: 'cra-org-admin', role: 'admin', createdAt: new Date('2026-02-01') },
			],
		});
		await prisma.projectMember.createMany({
			data: [
				{ projectId: 'cra-direct', userId: 'cra-project-admin', role: 'admin' },
				{ projectId: 'cra-inherited', userId: 'cra-demoted-org-admin', role: 'viewer' },
			],
		});
	});

	afterEach(cleanup);

	it('prefers a direct project admin over org admins', async () => {
		await expect(repository.getFirstProjectAdminUserId('cra-direct')).resolves.toBe('cra-project-admin');
	});

	it('falls back to an org admin without an explicit project role', async () => {
		await expect(repository.getFirstProjectAdminUserId('cra-inherited')).resolves.toBe('cra-org-admin');
	});

	it('throws when neither the project nor its org has an admin', async () => {
		await expect(repository.getFirstProjectAdminUserId('cra-solo')).rejects.toThrow(
			'No admin found for project cra-solo',
		);
	});
});

describe('context recommendation schema and queries', () => {
	const ORG_ID = 'cr-test-org';
	const PROJECT_ID = 'cr-test-project';
	const USER_ID = 'cr-test-user';
	const windowStart = new Date('2026-01-01T00:00:00Z');
	const windowEnd = new Date('2026-02-01T00:00:00Z');
	const inWindow = new Date('2026-01-15T00:00:00Z');

	async function cleanup() {
		// Cascades to project -> runs -> recommendations, and user -> chats -> messages.
		await prisma.contextRecommendation.deleteMany({ where: { projectId: PROJECT_ID } });
		await prisma.organization.deleteMany({ where: { id: ORG_ID } });
		await prisma.user.deleteMany({ where: { id: USER_ID } });
	}

	beforeEach(async () => {
		await cleanup();
		await prisma.organization.create({ data: { id: ORG_ID, name: 'CR Test', slug: ORG_ID } });
		await prisma.project.create({
			data: { id: PROJECT_ID, orgId: ORG_ID, name: 'CR Test', type: 'local', path: '/tmp/cr-test' },
		});
		await prisma.user.create({ data: { id: USER_ID, name: 'Grace', email: `${USER_ID}@example.com` } });
	});

	afterEach(cleanup);

	it('persists a run and a recommendation with defaults', async () => {
		const run = await repository.createRun({ projectId: PROJECT_ID, trigger: 'schedule', llmModelId: 'gpt-x' });

		expect(run.status).toBe('running');
		expect(run.trigger).toBe('schedule');

		const rec = await repository.insertRecommendation({
			projectId: PROJECT_ID,
			runId: run.id,
			fingerprint: 'tool_error::databases/x/columns.md::events_v1',
			suggestedFile: 'databases/x/columns.md',
			subjectKey: 'events_v1',
			title: 'events_v1 has no column descriptions',
			summary: 'Tool errors reference undocumented columns.',
			suggestedAction: 'Add descriptions for event_name, event_ts.',
			insights: [{ signalType: 'tool_error', metric: 'errors', count: 12, triggerRefs: [{ chatId: 'c1' }] }],
			impact: { affectedChats: 8, failureShare: 0.4 },
			impactScore: 80,
		});

		expect(rec.status).toBe('open');
		expect(rec.occurrenceCount).toBe(1);
		expect(rec.insights).toHaveLength(1);
		expect(rec.insights[0].signalType).toBe('tool_error');
		expect(rec.impact?.affectedChats).toBe(8);
	});

	it('counts friction signals and read costs in the window, excluding the analysis chats', async () => {
		const chat = await prisma.chat.create({ data: { projectId: PROJECT_ID, userId: USER_ID, title: 'Q' } });
		const analysisChat = await prisma.chat.create({
			data: { projectId: PROJECT_ID, userId: USER_ID, title: 'Context recommendations run' },
		});
		const run = await repository.createRun({ projectId: PROJECT_ID, trigger: 'manual' });
		await repository.setRunChat(run.id, analysisChat.id);

		for (const chatId of [chat.id, analysisChat.id]) {
			const message = await prisma.chatMessage.create({
				data: { chatId, role: 'assistant', createdAt: inWindow, supersededAt: inWindow },
			});
			await prisma.messagePart.createMany({
				data: [
					{
						messageId: message.id,
						order: 0,
						type: 'tool-execute_sql',
						toolCallId: `sql-${chatId}`,
						toolName: 'execute_sql',
						toolState: 'output-error',
						toolErrorText: 'boom',
						createdAt: inWindow,
					},
					{
						messageId: message.id,
						order: 1,
						type: 'tool-read',
						toolCallId: `read-${chatId}`,
						toolName: 'read',
						toolState: 'output-available',
						toolInput: { file_path: 'RULES.md' },
						toolOutput: { content: 'x'.repeat(40_000) },
						createdAt: inWindow,
					},
				],
			});
			await prisma.messageFeedback.create({ data: { messageId: message.id, vote: 'down', createdAt: inWindow } });
		}

		await expect(repository.getWindowTotals(PROJECT_ID, windowStart, windowEnd)).resolves.toEqual({
			errors: 1,
			downvotes: 1,
			regenerations: 1,
		});
		await expect(repository.getContextFileReadCosts(PROJECT_ID, windowStart, windowEnd)).resolves.toEqual([
			{
				filePath: 'RULES.md',
				readCount: 1,
				totalTokens: 8000,
				avgTokens: 8000,
				maxTokens: 8000,
				truncated: true,
			},
		]);
	});

	it('links downvotes to a recommendation once and reports them as no longer unlinked', async () => {
		const chat = await prisma.chat.create({ data: { projectId: PROJECT_ID, userId: USER_ID, title: 'Q' } });
		const message = await prisma.chatMessage.create({ data: { chatId: chat.id, role: 'assistant' } });
		await prisma.messageFeedback.create({ data: { messageId: message.id, vote: 'down', explanation: 'wrong' } });
		const run = await repository.createRun({ projectId: PROJECT_ID, trigger: 'manual' });
		const rec = await repository.insertRecommendation({
			projectId: PROJECT_ID,
			runId: run.id,
			fingerprint: 'fp',
			suggestedFile: 'RULES.md',
			subjectKey: 'k',
			title: 't',
			summary: 's',
			suggestedAction: 'a',
		});

		await expect(repository.getUnlinkedNegativeFeedbacks(PROJECT_ID)).resolves.toMatchObject([
			{ messageId: message.id, chatId: chat.id, explanation: 'wrong', userName: 'Grace' },
		]);

		await repository.linkFeedbackToRecommendation(PROJECT_ID, rec.id, [message.id, 'unknown-message']);
		await repository.linkFeedbackToRecommendation(PROJECT_ID, rec.id, [message.id]);

		await expect(repository.getUnlinkedNegativeFeedbacks(PROJECT_ID)).resolves.toEqual([]);
		await expect(repository.listFeedbacksForRecommendations(PROJECT_ID, [rec.id])).resolves.toEqual([
			{
				recommendationId: rec.id,
				messageId: message.id,
				chatId: chat.id,
				vote: 'down',
				explanation: 'wrong',
				userName: 'Grace',
			},
		]);
	});

	it('only cancels running runs and fails stale ones', async () => {
		const run = await repository.createRun({ projectId: PROJECT_ID, trigger: 'manual' });

		await expect(repository.cancelRun(run.id)).resolves.toBe(true);
		await expect(repository.cancelRun(run.id)).resolves.toBe(false);

		const stale = await repository.createRun({ projectId: PROJECT_ID, trigger: 'schedule' });
		await prisma.contextRecommendationRun.update({
			where: { id: stale.id },
			data: { startedAt: new Date(Date.now() - 60 * 60 * 1000) },
		});

		await expect(repository.getLatestRun(PROJECT_ID)).resolves.toMatchObject({
			status: expect.stringMatching(/cancelled|failed/),
		});
		await expect(repository.getRunById(PROJECT_ID, stale.id)).resolves.toMatchObject({ status: 'failed' });
	});

	it('upserts the config, ignoring undefined fields', async () => {
		await repository.updateConfig(PROJECT_ID, { frequency: 'daily', autoCreatePrs: true });
		await repository.updateConfig(PROJECT_ID, { frequency: undefined, customSystemPromptInstructions: 'Be brief' });

		await expect(repository.getConfig(PROJECT_ID)).resolves.toMatchObject({
			frequency: 'daily',
			autoCreatePrs: true,
			customSystemPromptInstructions: 'Be brief',
		});
		await expect(repository.listProjectRecommendationScheduleConfigs()).resolves.toContainEqual({
			projectId: PROJECT_ID,
			frequency: 'daily',
		});
	});
});
