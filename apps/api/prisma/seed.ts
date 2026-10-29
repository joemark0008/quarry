import 'reflect-metadata';

import crypto from 'node:crypto';

import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { hashPassword } from 'better-auth/crypto';

import { ConfigModule } from '../src/config/config.module.js';
import { ConfigService } from '../src/config/config.service.js';
import { OrganizationRepository } from '../src/organizations/organization.repository.js';
import { OrganizationsModule } from '../src/organizations/organizations.module.js';
import { PrismaModule } from '../src/prisma/prisma.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { ProjectRepository } from '../src/projects/project.repository.js';
import { ProjectsModule } from '../src/projects/projects.module.js';
import { UserRepository } from '../src/users/user.repository.js';

/** Port of upstream `scripts/db.seed.ts`. */
const ADMIN_EMAIL = 'test@test.test';
const ADMIN_PASSWORD = 'test1234';
const ADMIN_NAME = 'Test';
const ORG_NAME = 'Test Organization';
const ORG_SLUG = 'test';
const PROJECT_NAME = 'Test Project';

@Module({
	imports: [ConfigModule, PrismaModule, ProjectsModule, OrganizationsModule],
	providers: [UserRepository],
})
class SeedModule {}

/**
 * Seeds the database with an admin user, organization, and project.
 * When GitHub auth is configured, the seed user gets a random password
 * (users sign in via GitHub instead).
 */
async function seed() {
	const app = await NestFactory.createApplicationContext(SeedModule, { logger: ['error', 'warn'] });
	try {
		const { env } = app.get(ConfigService);
		const prisma = app.get(PrismaService);
		const users = app.get(UserRepository);
		const orgs = app.get(OrganizationRepository);
		const projects = app.get(ProjectRepository);

		const projectPath = env.QUARRY_DEFAULT_PROJECT_PATH ?? './';
		const useGithubAuth = env.GITHUB_SSO && !!env.GITHUB_CLIENT_ID && !!env.GITHUB_CLIENT_SECRET;

		console.log('Seeding database...');

		const existingUser = await users.getUser({ email: ADMIN_EMAIL });
		const existingOrg = await orgs.getOrganizationBySlug(ORG_SLUG);
		const existingProject = await projects.getProjectByPath(projectPath);

		if (existingUser && existingOrg && existingProject) {
			console.log('Seed data already present. Skipping.');
			return;
		}

		const password = useGithubAuth ? crypto.randomUUID() : ADMIN_PASSWORD;
		const hashedPassword = await hashPassword(password);

		await prisma.$transaction(async (tx) => {
			const userId = existingUser?.id ?? crypto.randomUUID();
			if (!existingUser) {
				await users.createUser(
					{ id: userId, name: ADMIN_NAME, email: ADMIN_EMAIL, emailVerified: true },
					{ id: crypto.randomUUID(), accountId: userId, providerId: 'credential', password: hashedPassword },
					tx,
				);
			}

			const org = existingOrg ?? (await orgs.createOrganization({ name: ORG_NAME, slug: ORG_SLUG }, tx));
			await orgs.addOrgMemberIfMissing({ orgId: org.id, userId, role: 'admin' }, tx);

			const project =
				existingProject ??
				(await projects.createProject(
					{ name: PROJECT_NAME, type: 'local', path: projectPath, orgId: org.id },
					tx,
				));

			if (!(await projects.getProjectMember(project.id, userId, tx))) {
				await projects.addProjectMember({ projectId: project.id, userId, role: 'admin' }, tx);
			}
		});

		console.log('Done.');
		if (!existingUser && !useGithubAuth) {
			console.log(`  Email:    ${ADMIN_EMAIL}`);
			console.log(`  Password: ${ADMIN_PASSWORD}`);
		}
		if (!existingProject) {
			console.log(`  Project:  ${PROJECT_NAME} (${projectPath})`);
		}
	} finally {
		await app.close();
	}
}

seed().catch((err) => {
	console.error(err);
	process.exit(1);
});
