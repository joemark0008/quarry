import { Injectable } from '@nestjs/common';
import { SYSTEM_EXAMPLE_PROJECT_ID } from '@quarry/shared';

import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { JAFFLE_SHOP_STORY } from '../fixtures/jaffle-shop-story.js';

export const SYSTEM_EXAMPLE_USER_ID = 'system-example-user';
export const SYSTEM_EXAMPLE_CHAT_ID = 'system-example-story-chat';
export const SYSTEM_EXAMPLE_STORY_ID = 'system-example-story';

const SYSTEM_EXAMPLE_MESSAGE_ID = 'system-example-story-message';
const SYSTEM_EXAMPLE_VERSION_ID = 'system-example-story-version';
const SYSTEM_EXAMPLE_SHARE_ID = 'system-example-story-share';

/**
 * Port of upstream `queries/example-story.queries.ts`: seeds the pinned Jaffle Shop story of the system example
 * project, which must exist already (upstream `upsertSystemExampleProject`). Each upstream `insert … on conflict
 * (id) do update` is a Prisma upsert on the id, all in one transaction.
 */
@Injectable()
export class ExampleStoryRepository {
	constructor(private readonly prisma: PrismaService) {}

	async upsertSystemExampleStory(): Promise<void> {
		await this.prisma.$transaction((tx) => runSeed(tx));
	}
}

async function runSeed(tx: Prisma.TransactionClient): Promise<void> {
	const now = new Date();
	const user = {
		name: 'Quarry',
		email: 'system-example@quarry.invalid',
		emailVerified: true,
		memoryEnabled: false,
	};
	await tx.user.upsert({
		where: { id: SYSTEM_EXAMPLE_USER_ID },
		create: { id: SYSTEM_EXAMPLE_USER_ID, ...user },
		update: { ...user, updatedAt: now },
	});

	const chat = {
		userId: SYSTEM_EXAMPLE_USER_ID,
		projectId: SYSTEM_EXAMPLE_PROJECT_ID,
		title: JAFFLE_SHOP_STORY.title,
	};
	await tx.chat.upsert({
		where: { id: SYSTEM_EXAMPLE_CHAT_ID },
		create: { id: SYSTEM_EXAMPLE_CHAT_ID, ...chat },
		update: { ...chat, deletedAt: null, updatedAt: now },
	});

	const story = {
		chatId: SYSTEM_EXAMPLE_CHAT_ID,
		slug: JAFFLE_SHOP_STORY.slug,
		title: JAFFLE_SHOP_STORY.title,
		format: JAFFLE_SHOP_STORY.format,
	};
	await tx.story.upsert({
		where: { id: SYSTEM_EXAMPLE_STORY_ID },
		create: { id: SYSTEM_EXAMPLE_STORY_ID, ...story },
		update: { ...story, archivedAt: null, updatedAt: now },
	});

	const version = {
		storyId: SYSTEM_EXAMPLE_STORY_ID,
		version: 1,
		code: JAFFLE_SHOP_STORY.code,
		action: 'create',
		source: 'assistant',
	};
	await tx.storyVersion.upsert({
		where: { id: SYSTEM_EXAMPLE_VERSION_ID },
		create: { id: SYSTEM_EXAMPLE_VERSION_ID, ...version },
		update: version,
	});

	await tx.chatMessage.upsert({
		where: { id: SYSTEM_EXAMPLE_MESSAGE_ID },
		create: { id: SYSTEM_EXAMPLE_MESSAGE_ID, chatId: SYSTEM_EXAMPLE_CHAT_ID, role: 'assistant' },
		update: { chatId: SYSTEM_EXAMPLE_CHAT_ID, role: 'assistant', supersededAt: null },
	});

	for (const [order, [queryId, query]] of Object.entries(JAFFLE_SHOP_STORY.queries).entries()) {
		const part = {
			messageId: SYSTEM_EXAMPLE_MESSAGE_ID,
			order,
			type: 'tool-execute_sql',
			toolCallId: `system-example-story-tool-${queryId}`,
			toolName: 'execute_sql',
			toolState: 'output-available',
			toolInput: {
				sql_query: query.sql,
				name: query.name,
			},
			toolOutput: {
				_version: '1',
				id: queryId,
				columns: query.columns,
				data: query.data,
				row_count: query.data.length,
			},
		};
		await tx.messagePart.upsert({
			where: { id: `system-example-story-part-${queryId}` },
			create: { id: `system-example-story-part-${queryId}`, ...part },
			update: part,
		});
	}

	const share = {
		storyId: SYSTEM_EXAMPLE_STORY_ID,
		projectId: SYSTEM_EXAMPLE_PROJECT_ID,
		userId: SYSTEM_EXAMPLE_USER_ID,
		visibility: 'project',
		isPinned: true,
	};
	await tx.sharedStory.upsert({
		where: { id: SYSTEM_EXAMPLE_SHARE_ID },
		create: { id: SYSTEM_EXAMPLE_SHARE_ID, ...share },
		update: share,
	});
}
