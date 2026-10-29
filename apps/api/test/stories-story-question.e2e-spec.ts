import type { INestApplication } from '@nestjs/common';
import type { Tool } from 'ai';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import storyTool from '../src/agent/tools/story.js';
import type { ForkMetadata, UIMessage } from '../src/agent/types/chat.js';
import type { LinkedStory, ToolContext } from '../src/agent/types/tools.js';
import { ChatRepository } from '../src/chats/chat.repository.js';
import type { Prisma } from '../src/generated/prisma/client.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { StoryRepository } from '../src/stories/repositories/story.repository.js';
import { addStoryQuestionReference, resolveLinkedStory } from '../src/stories/services/story-question.js';
import { createStoriesTestApp } from './stories-test-module.js';

/** Port of upstream `tests/story-question.test.ts` on Postgres (the story tool editing a quick question's story). */

let app: INestApplication;
let prisma: PrismaService;
let chats: ChatRepository;
let stories: StoryRepository;

const PROJECT_ID = 'question-project';
const OWNER_ID = 'question-owner';
const VIEWER_ID = 'question-viewer';
const ORIGIN_CHAT_ID = 'question-origin-chat';
const QUESTION_CHAT_ID = 'question-chat';
const VIEWER_QUESTION_CHAT_ID = 'question-chat-of-viewer';
const STORY_ID = 'question-story';
const SHARED_CHAT_QUESTION_ID = 'question-about-shared-chat';
const SHARE_ID = 'question-share';
const SLUG = 'revenue';
const ORIGINAL_CODE = '# Revenue\n\n<chart query_id="query_origin" chart_type="bar" x_axis_key="month" />\n';

describe('quick questions on a story', () => {
	beforeAll(async () => {
		({ app, prisma } = await createStoriesTestApp());
		chats = app.get(ChatRepository);
		stories = app.get(StoryRepository);
		await seed();
	});

	afterAll(async () => {
		await app?.close();
	});

	it('keeps quick questions out of the chat history and search, and lists them under their story or shared chat', async () => {
		const historyIds = (await chats.listOwnChats(OWNER_ID)).map((chat) => chat.id);

		expect(historyIds).toContain(ORIGIN_CHAT_ID);
		expect(historyIds).not.toContain(QUESTION_CHAT_ID);
		expect(historyIds).not.toContain(SHARED_CHAT_QUESTION_ID);
		expect((await chats.searchUserChats(OWNER_ID, 'Ask about')).map((chat) => chat.id)).toEqual([]);
		expect((await chats.listQuickQuestionChats(OWNER_ID, STORY_ID)).map((chat) => chat.chatId)).toEqual([
			QUESTION_CHAT_ID,
		]);
		expect((await chats.listQuickQuestionChats(OWNER_ID, SHARE_ID)).map((chat) => chat.chatId)).toEqual([
			SHARED_CHAT_QUESTION_ID,
		]);
	});

	it('links a quick question to its story, editable by its owner only', async () => {
		const forkMetadata = questionMetadata();

		expect(await resolveLinkedStory({ userId: OWNER_ID, projectId: PROJECT_ID, forkMetadata })).toMatchObject({
			storyId: STORY_ID,
			chatId: ORIGIN_CHAT_ID,
			slug: SLUG,
			canEdit: true,
		});
		expect(await resolveLinkedStory({ userId: VIEWER_ID, projectId: PROJECT_ID, forkMetadata })).toMatchObject({
			canEdit: false,
		});
		expect(
			await resolveLinkedStory({ userId: OWNER_ID, projectId: PROJECT_ID, forkMetadata: null }),
		).toBeUndefined();
	});

	it('references the story from the first message so its content reaches the agent', () => {
		const messages: Omit<UIMessage, 'id'>[] = [{ role: 'user', parts: [{ type: 'text', text: 'Why a dip?' }] }];

		const [first] = addStoryQuestionReference(messages, questionMetadata());

		expect(first.parts.map((part) => (part.type === 'text' ? part.text : ''))).toEqual([
			`This question is about the story @[story:${STORY_ID}].`,
			'Why a dip?',
		]);
		expect(addStoryQuestionReference(messages, null)).toBe(messages);
	});

	it("edits the story in its own chat from its owner's quick question, with the queries it now uses", async () => {
		const linkedStory = await resolveLinkedStory({
			userId: OWNER_ID,
			projectId: PROJECT_ID,
			forkMetadata: questionMetadata(),
		});
		const newCode = `${ORIGINAL_CODE}<table query_id="query_question" />\n`;

		const output = await runStoryTool(
			{ action: 'replace', id: SLUG, code: newCode },
			{ chatId: QUESTION_CHAT_ID, userId: OWNER_ID, linkedStory },
		);

		expect(output).toMatchObject({ success: true, version: 2, story_chat_id: ORIGIN_CHAT_ID });
		expect((await stories.getLatestVersionByChatAndSlug(ORIGIN_CHAT_ID, SLUG))?.code).toBe(newCode);
		expect(await chats.getLatestSqlQueriesByIds(ORIGIN_CHAT_ID, new Set(['query_question']))).toMatchObject({
			query_question: { sqlQuery: 'select region, sum(amount) from orders group by 1' },
		});
	});

	it('copies a query run in the same turn, before it is saved, to the story chat', async () => {
		const linkedStory = await resolveLinkedStory({
			userId: OWNER_ID,
			projectId: PROJECT_ID,
			forkMetadata: questionMetadata(),
		});
		const queryResults: ToolContext['queryResults'] = new Map([
			[
				'query_same_turn',
				{ columns: ['city'], data: [{ city: 'Paris' }], sqlQuery: 'select city from customers' },
			],
		]);

		const output = await runStoryTool(
			{ action: 'replace', id: SLUG, code: `${ORIGINAL_CODE}<table query_id="query_same_turn" />\n` },
			{ chatId: QUESTION_CHAT_ID, userId: OWNER_ID, linkedStory, queryResults },
		);

		expect(output).toMatchObject({ success: true });
		expect(await chats.getLatestSqlQueriesByIds(ORIGIN_CHAT_ID, new Set(['query_same_turn']))).toMatchObject({
			query_same_turn: { sqlQuery: 'select city from customers' },
		});
	});

	it('keeps the story read-only for anyone else', async () => {
		const linkedStory = await resolveLinkedStory({
			userId: VIEWER_ID,
			projectId: PROJECT_ID,
			forkMetadata: questionMetadata(),
		});

		const output = await runStoryTool(
			{ action: 'replace', id: SLUG, code: '# Hacked' },
			{ chatId: VIEWER_QUESTION_CHAT_ID, userId: VIEWER_ID, linkedStory },
		);

		expect(output).toMatchObject({
			success: false,
			error: `Story "${SLUG}" is read-only here: only its owner can edit it.`,
		});
		expect((await stories.getLatestVersionByChatAndSlug(ORIGIN_CHAT_ID, SLUG))?.code).not.toBe('# Hacked');
	});

	it('keeps editing the linked story when the question chat has a story under the same slug', async () => {
		const linkedStory = await resolveLinkedStory({
			userId: OWNER_ID,
			projectId: PROJECT_ID,
			forkMetadata: questionMetadata(),
		});
		await prisma.story.create({
			data: { id: 'shadow-story', chatId: QUESTION_CHAT_ID, slug: SLUG, title: 'Shadow' },
		});
		await prisma.storyVersion.create({
			data: { storyId: 'shadow-story', version: 1, code: '# Shadow', action: 'create', source: 'assistant' },
		});
		const newCode = `${ORIGINAL_CODE}<!-- linked -->\n`;

		const output = await runStoryTool(
			{ action: 'replace', id: SLUG, code: newCode },
			{ chatId: QUESTION_CHAT_ID, userId: OWNER_ID, linkedStory },
		);

		expect(output).toMatchObject({ success: true });
		expect((await stories.getLatestVersionByChatAndSlug(ORIGIN_CHAT_ID, SLUG))?.code).toBe(newCode);
		expect((await stories.getLatestVersionByChatAndSlug(QUESTION_CHAT_ID, SLUG))?.code).toBe('# Shadow');
	});

	it('refuses to create a story under the slug of the story the question is about', async () => {
		const linkedStory = await resolveLinkedStory({
			userId: OWNER_ID,
			projectId: PROJECT_ID,
			forkMetadata: questionMetadata(),
		});

		const output = await runStoryTool(
			{ action: 'create', id: SLUG, code: '# Copy' },
			{ chatId: QUESTION_CHAT_ID, userId: OWNER_ID, linkedStory },
		);

		expect(output).toMatchObject({ success: false });
	});

	it('stops linking the story once it is no longer shared with the user', async () => {
		await prisma.sharedStory.deleteMany({ where: { storyId: STORY_ID } });

		expect(
			await resolveLinkedStory({ userId: VIEWER_ID, projectId: PROJECT_ID, forkMetadata: questionMetadata() }),
		).toBeUndefined();
		expect(
			await resolveLinkedStory({ userId: OWNER_ID, projectId: PROJECT_ID, forkMetadata: questionMetadata() }),
		).toMatchObject({
			canEdit: true,
		});
	});
});

function questionMetadata(): ForkMetadata {
	return { type: 'story_question', id: STORY_ID, title: 'Revenue', authorName: 'Owner' };
}

async function runStoryTool(
	input: { action: 'replace' | 'create'; id: string; code: string },
	context: {
		chatId: string;
		userId: string;
		linkedStory: LinkedStory | undefined;
		queryResults?: ToolContext['queryResults'];
	},
) {
	const tool = storyTool as Tool<typeof input, { success: boolean }>;
	return tool.execute!(input, {
		toolCallId: 'story-call',
		messages: [],
		experimental_context: {
			...context,
			projectId: PROJECT_ID,
			userGroupFeatures: ['storyCreation'],
			queryResults: context.queryResults ?? new Map(),
			generatedArtifacts: { charts: [], maps: [], stories: [] },
		} as unknown as ToolContext,
	});
}

async function seed() {
	await prisma.user.createMany({
		data: [
			{ id: OWNER_ID, name: 'Owner', email: 'question-owner@example.com' },
			{ id: VIEWER_ID, name: 'Viewer', email: 'question-viewer@example.com' },
		],
	});
	await prisma.project.create({ data: { id: PROJECT_ID, name: 'Questions', type: 'local', path: '/tmp/questions' } });
	await prisma.chat.createMany({
		data: [
			{ id: ORIGIN_CHAT_ID, userId: OWNER_ID, projectId: PROJECT_ID, title: 'Revenue analysis' },
			{
				id: QUESTION_CHAT_ID,
				userId: OWNER_ID,
				projectId: PROJECT_ID,
				title: 'Ask about revenue',
				forkMetadata: questionMetadata() as unknown as Prisma.InputJsonValue,
			},
			{
				id: VIEWER_QUESTION_CHAT_ID,
				userId: VIEWER_ID,
				projectId: PROJECT_ID,
				title: 'Viewer question',
				forkMetadata: questionMetadata() as unknown as Prisma.InputJsonValue,
			},
			{
				id: SHARED_CHAT_QUESTION_ID,
				userId: OWNER_ID,
				projectId: PROJECT_ID,
				title: 'Ask about a shared chat',
				forkMetadata: { type: 'chat_question', id: SHARE_ID, title: 'Shared analysis', authorName: 'Owner' },
			},
		],
	});
	await prisma.story.create({ data: { id: STORY_ID, chatId: ORIGIN_CHAT_ID, slug: SLUG, title: 'Revenue' } });
	await prisma.sharedStory.create({ data: { storyId: STORY_ID, projectId: PROJECT_ID, userId: OWNER_ID } });
	await prisma.storyVersion.create({
		data: { storyId: STORY_ID, version: 1, code: ORIGINAL_CODE, action: 'create', source: 'assistant' },
	});
	await insertQuery(ORIGIN_CHAT_ID, 'query_origin', 'select month, sum(amount) from orders group by 1');
	await insertQuery(QUESTION_CHAT_ID, 'query_question', 'select region, sum(amount) from orders group by 1');
}

async function insertQuery(chatId: string, queryId: string, sqlQuery: string) {
	const messageId = `${chatId}-${queryId}`;
	await prisma.chatMessage.create({ data: { id: messageId, chatId, role: 'assistant' } });
	await prisma.messagePart.create({
		data: {
			messageId,
			order: 0,
			type: 'tool-execute_sql',
			toolName: 'execute_sql',
			toolCallId: `${messageId}-call`,
			toolState: 'output-available',
			toolInput: { sql_query: sqlQuery },
			toolOutput: { id: queryId, columns: ['label', 'value'], data: [{ label: 'a', value: 1 }], row_count: 1 },
		},
	});
}
