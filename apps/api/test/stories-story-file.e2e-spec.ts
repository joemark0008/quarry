import type { INestApplication } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { PrismaService } from '../src/prisma/prisma.service.js';
import {
	hashContent,
	MAX_STORY_FILES,
	storyAppOfBundle,
	StoryFileLimitError,
	StoryFileRepository,
} from '../src/stories/repositories/story-file.repository.js';
import { createStoriesTestApp } from './stories-test-module.js';

/**
 * Port of upstream `tests/story-blob-cleanup.test.ts`, plus quarry checks of the draft → version flow
 * (upstream covers it only through the story tool and MCP tests, which come with stage 2).
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const longAgo = new Date(Date.now() - 7 * DAY_MS);

let app: INestApplication;
let prisma: PrismaService;
let files: StoryFileRepository;

beforeAll(async () => {
	({ app, prisma } = await createStoriesTestApp());
	files = app.get(StoryFileRepository);

	await prisma.user.create({ data: { id: 'user-1', name: 'User', email: 'user@example.com' } });
	await prisma.project.create({ data: { id: 'project-1', name: 'Project', type: 'local', path: '/tmp/project' } });
	await prisma.chat.create({ data: { id: 'chat-1', projectId: 'project-1', userId: 'user-1', title: 'Chat' } });
	await prisma.story.create({ data: { id: 'story-1', chatId: 'chat-1', slug: 'revenue', title: 'Revenue' } });
	await prisma.storyVersion.create({
		data: { id: 'version-1', storyId: 'story-1', code: '', version: 1, action: 'create', source: 'assistant' },
	});
});

afterAll(async () => {
	await app?.close();
});

async function insertBlob(contentHash: string, createdAt: Date): Promise<void> {
	await prisma.storyFileBlob.create({
		data: { contentHash, content: contentHash, size: contentHash.length, createdAt },
	});
}

async function blobHashes(): Promise<string[]> {
	const rows = await prisma.storyFileBlob.findMany({ select: { contentHash: true } });
	return rows.map((row) => row.contentHash);
}

describe('deleteUnreferencedFileBlobs', () => {
	afterEach(async () => {
		await prisma.storyFile.deleteMany();
		await prisma.storyFileBlob.deleteMany();
	});

	it('deletes old blobs no story file references', async () => {
		await insertBlob('orphan', longAgo);

		expect(await files.deleteUnreferencedFileBlobs(new Date(Date.now() - DAY_MS))).toBe(1);
		expect(await blobHashes()).toEqual([]);
	});

	it('keeps blobs a story file still references', async () => {
		await insertBlob('used', longAgo);
		await prisma.storyFile.create({ data: { storyVersionId: 'version-1', path: 'app.jsx', contentHash: 'used' } });

		expect(await files.deleteUnreferencedFileBlobs(new Date(Date.now() - DAY_MS))).toBe(0);
		expect(await blobHashes()).toEqual(['used']);
	});

	it('keeps recent unreferenced blobs that a publish may still be inserting files for', async () => {
		await insertBlob('fresh', new Date());

		expect(await files.deleteUnreferencedFileBlobs(new Date(Date.now() - DAY_MS))).toBe(0);
		expect(await blobHashes()).toEqual(['fresh']);
	});
});

describe('story drafts and versions', () => {
	afterEach(async () => {
		await prisma.storyDraftFile.deleteMany();
		await prisma.storyVersion.deleteMany({ where: { id: { not: 'version-1' } } });
		await prisma.storyFileBlob.deleteMany();
	});

	it('writes, normalizes, replaces and deletes draft files', async () => {
		const written = await files.writeDraftFile('story-1', { path: './src/app.tsx', content: 'v1' });
		await files.writeDraftFile('story-1', { path: 'src/app.tsx', content: 'v2' });

		expect(written.path).toBe('src/app.tsx');
		expect((await files.getDraftFile('story-1', 'src/app.tsx'))?.content).toBe('v2');
		await expect(files.writeDraftFile('story-1', { path: 'src/app.tsx/x.ts', content: '' })).rejects.toThrow(
			StoryFileLimitError,
		);

		await files.replaceDraftFiles('story-1', [
			{ path: 'b.css', content: 'b' },
			{ path: 'a.tsx', content: 'a' },
		]);
		expect((await files.listDraftFiles('story-1')).map((file) => file.path)).toEqual(['a.tsx', 'b.css']);
		expect(await files.deleteDraftFile('story-1', 'a.tsx')).toBe(true);
		expect(await files.deleteDraftFile('story-1', 'a.tsx')).toBe(false);
	});

	it('caps the number of draft files', async () => {
		await files.seedDraftFiles(
			'story-1',
			Array.from({ length: MAX_STORY_FILES }, (_, index) => ({ path: `f${index}.md`, content: '' })),
		);

		await expect(files.writeDraftFile('story-1', { path: 'extra.md', content: '' })).rejects.toThrow(
			`A story can hold at most ${MAX_STORY_FILES} files.`,
		);
		await expect(files.writeDraftFile('story-1', { path: 'f0.md', content: 'edit' })).resolves.toMatchObject({
			content: 'edit',
		});
	});

	it('cuts numbered versions from the draft, sharing blobs by content hash', async () => {
		await files.seedDraftFiles('story-1', [
			{ path: 'app.tsx', content: 'same' },
			{ path: 'copy.tsx', content: 'same' },
		]);
		await prisma.storyFileBlob.create({
			data: { contentHash: hashContent('same'), content: 'same', size: 4, createdAt: longAgo },
		});

		const { version, files: versionFiles } = await files.cutVersionFromDraft({
			storyId: 'story-1',
			action: 'update',
			source: 'assistant',
		});

		expect(version).toMatchObject({ storyId: 'story-1', version: 2, code: '', action: 'update' });
		expect(versionFiles.map((file) => file.path).sort()).toEqual(['app.tsx', 'copy.tsx']);
		const [blob] = await prisma.storyFileBlob.findMany();
		expect(blob.createdAt.getTime()).toBeGreaterThan(longAgo.getTime());
		expect(await files.listVersionFiles(version.id)).toMatchObject([
			{ path: 'app.tsx', content: 'same' },
			{ path: 'copy.tsx', content: 'same' },
		]);
		expect((await files.getVersionFile(version.id, 'copy.tsx'))?.content).toBe('same');

		const pinned = await files.cutVersionFromDraft({
			storyId: 'story-1',
			action: 'replace',
			source: 'user',
			versionNumber: 7,
		});
		expect(pinned.version.version).toBe(7);

		await files.writeDraftFile('story-1', { path: 'app.tsx', content: 'changed' });
		await files.restoreDraftFromVersion('story-1', version.id);
		expect((await files.getDraftFile('story-1', 'app.tsx'))?.content).toBe('same');
	});

	it('refuses to cut a version from an empty draft', async () => {
		await expect(
			files.cutVersionFromDraft({ storyId: 'story-1', action: 'create', source: 'user' }),
		).rejects.toThrow('The story has no draft files to publish.');
	});

	it('stores a version bundle and its thumbnail', async () => {
		expect(await files.setVersionThumbnail('version-1', 'png', 'light')).toBe(false);

		await files.setVersionBundle('version-1', { kind: 'html', bundle: 'js', pageShell: '<html>' });
		expect(await files.setVersionThumbnail('version-1', 'png', 'light')).toBe(true);
		expect(await files.getVersionThumbnail('version-1')).toEqual({ thumbnail: 'png', renderKey: 'light' });
		const bundle = await files.getVersionBundle('version-1');
		expect(bundle).not.toHaveProperty('thumbnail');
		expect(storyAppOfBundle(bundle)).toEqual({ kind: 'html', bundle: 'js', pageShell: '<html>' });

		await files.setVersionBundle('version-1', { kind: 'react', bundle: 'react-js' });
		expect(await files.getVersionThumbnail('version-1')).toBeNull();
		expect(storyAppOfBundle(await files.getVersionBundle('version-1'))).toEqual({
			kind: 'react',
			bundle: 'react-js',
		});
	});
});
