import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { ConfigModule } from '../src/config/config.module.js';
import { PrismaModule } from '../src/prisma/prisma.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { StoriesCoreModule } from '../src/stories/stories-core.module.js';
import { resetDatabase, useTestDatabase } from './test-app.js';

/** The story repositories on an emptied e2e database, without the HTTP app around them. */
export async function createStoriesTestApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
	const databaseUrl = useTestDatabase();
	await resetDatabase(databaseUrl);
	const moduleRef = await Test.createTestingModule({
		imports: [ConfigModule, PrismaModule, StoriesCoreModule],
	}).compile();
	const app = moduleRef.createNestApplication({ logger: ['error'] });
	await app.init();
	return { app, prisma: app.get(PrismaService) };
}
