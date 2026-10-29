import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { PrismaService } from '../src/prisma/prisma.service.js';
import { SharedStoryRepository } from '../src/stories/repositories/shared-story.repository.js';
import { StoryRepository } from '../src/stories/repositories/story.repository.js';
import {
	MoveFolderCycleError,
	StoryFolderRepository,
	SystemFolderError,
} from '../src/stories/repositories/story-folder.repository.js';
import { createStoriesTestApp } from './stories-test-module.js';

/**
 * Quarry checks of `StoryFolderRepository` on Postgres: upstream tests the folder queries only through mocked
 * routes (`story-folder-bulk-move.test.ts`, stage 2), so the raw private-root upsert, the folder tree counts, the
 * advisory-locked moves and the share propagation are covered here.
 */

const PROJECT_ID = 'folder-project';
const OWNER_ID = 'folder-owner';
const VIEWER_ID = 'folder-viewer';
const GROUP_ID = 'folder-group';

let app: INestApplication;
let prisma: PrismaService;
let folders: StoryFolderRepository;
let stories: StoryRepository;
let sharedStories: SharedStoryRepository;

beforeAll(async () => {
	({ app, prisma } = await createStoriesTestApp());
	folders = app.get(StoryFolderRepository);
	stories = app.get(StoryRepository);
	sharedStories = app.get(SharedStoryRepository);

	await prisma.user.createMany({
		data: [
			{ id: OWNER_ID, name: 'Owner', email: 'folder-owner@example.com' },
			{ id: VIEWER_ID, name: 'Viewer', email: 'folder-viewer@example.com' },
		],
	});
	await prisma.project.create({ data: { id: PROJECT_ID, name: 'Folders', type: 'local', path: '/tmp/folders' } });
	await prisma.userGroup.create({ data: { id: GROUP_ID, projectId: PROJECT_ID, name: 'Group' } });
	await prisma.userGroupMember.create({ data: { groupId: GROUP_ID, userId: VIEWER_ID } });
});

beforeEach(async () => {
	await prisma.storyFolder.updateMany({ data: { parentId: null } });
	await prisma.storyFolder.deleteMany();
	await prisma.story.deleteMany();
	for (const id of ['story-a', 'story-b']) {
		await prisma.story.create({ data: { id, projectId: PROJECT_ID, userId: OWNER_ID, slug: id, title: id } });
	}
});

afterAll(async () => {
	await app?.close();
});

describe('story folders', () => {
	it('creates one private root per owner and project, and saves stories in it', async () => {
		const first = await folders.ensurePrivateRoot(OWNER_ID, PROJECT_ID);
		const second = await folders.ensurePrivateRoot(OWNER_ID, PROJECT_ID);

		expect(second).toBe(first);
		expect(await folders.getFolderById(first)).toMatchObject({
			name: 'My private folder',
			visibility: 'private',
			systemType: 'private_folder',
		});

		await folders.saveStoryInPrivateRoot(OWNER_ID, PROJECT_ID, 'story-a');
		await folders.saveStoryInPrivateRoot(OWNER_ID, PROJECT_ID, 'story-a');
		expect(await folders.getStoryFolderItem('story-a')).toEqual({ folderId: first });
		await expect(folders.updateFolder(first, { name: 'Renamed' })).rejects.toThrow(SystemFolderError);
	});

	it('lists the folder tree with story counts and the shared with me folder', async () => {
		const finance = await folders.createFolder({ ownerId: OWNER_ID, projectId: PROJECT_ID, name: 'Finance' });
		const privateRoot = await folders.ensurePrivateRoot(OWNER_ID, PROJECT_ID);
		await prisma.storyFolderItem.createMany({
			data: [
				{ storyId: 'story-a', folderId: finance.id },
				{ storyId: 'story-b', folderId: finance.id },
			],
		});
		await sharedStories.createSharedStory(
			{ storyId: 'story-a', projectId: PROJECT_ID, userId: OWNER_ID, visibility: 'specific' },
			{ groupIds: [GROUP_ID] },
		);

		const ownerTree = await folders.listFolderTree(OWNER_ID, PROJECT_ID);
		const viewerTree = await folders.listFolderTree(VIEWER_ID, PROJECT_ID);

		expect(ownerTree.map((folder) => [folder.name, folder.storyCount])).toEqual([
			['Finance', 2],
			['My private folder', 0],
		]);
		expect(viewerTree.map((folder) => [folder.id, folder.storyCount])).toEqual([
			['__shared_with_me__', 1],
			[finance.id, 2],
		]);
		expect(await folders.listFolderTree(OWNER_ID, PROJECT_ID, { isViewer: true })).toHaveLength(1);
		expect(
			(await folders.listFolderItemsForProject(VIEWER_ID, PROJECT_ID)).map((item) => item.storyId).sort(),
		).toEqual(['story-a', 'story-b']);
		expect(privateRoot).toBeTruthy();
	});

	it('refuses to move a folder under its own descendant', async () => {
		const parent = await folders.createFolder({ ownerId: OWNER_ID, projectId: PROJECT_ID, name: 'Parent' });
		const child = await folders.createFolder({
			ownerId: OWNER_ID,
			projectId: PROJECT_ID,
			name: 'Child',
			parentId: parent.id,
		});

		await expect(folders.moveFolder(OWNER_ID, PROJECT_ID, parent.id, child.id)).rejects.toThrow(
			MoveFolderCycleError,
		);
		expect(await folders.proposedParentChainContains(child.id, parent.id)).toBe(true);
	});

	it('shares the stories of a folder moved into a public folder and unshares them in a private one', async () => {
		const privateRoot = await folders.ensurePrivateRoot(OWNER_ID, PROJECT_ID);
		const reports = await folders.createFolder({
			ownerId: OWNER_ID,
			projectId: PROJECT_ID,
			name: 'Reports',
			parentId: privateRoot,
		});
		const team = await folders.createFolder({ ownerId: OWNER_ID, projectId: PROJECT_ID, name: 'Team' });
		expect(reports.visibility).toBe('private');
		await folders.moveStoryToFolder('story-a', reports.id, { storyOwnerId: OWNER_ID, projectId: PROJECT_ID });
		expect(await sharedStories.getSharedStoryInfo('story-a', PROJECT_ID)).toBeNull();

		await folders.moveFolder(OWNER_ID, PROJECT_ID, reports.id, team.id);

		expect((await folders.getFolderById(reports.id))?.visibility).toBe('public');
		expect(await sharedStories.getSharedStoryInfo('story-a', PROJECT_ID)).toMatchObject({ visibility: 'project' });

		await folders.moveItemsToFolder(
			OWNER_ID,
			PROJECT_ID,
			{ folderIds: [reports.id], stories: [{ storyId: 'story-b', storyOwnerId: OWNER_ID }] },
			privateRoot,
		);
		expect(await sharedStories.getSharedStoryInfo('story-a', PROJECT_ID)).toBeNull();
		expect(await folders.getStoryFolderItem('story-b')).toEqual({ folderId: privateRoot });
	});

	it('makes a story private only when it is not already in a private folder', async () => {
		await folders.moveStoryToFolder('story-a', null, { storyOwnerId: OWNER_ID, projectId: PROJECT_ID });
		expect(await sharedStories.getSharedStoryInfo('story-a', PROJECT_ID)).toMatchObject({ visibility: 'project' });

		await folders.ensureStoryPrivate('story-a', { storyOwnerId: OWNER_ID, projectId: PROJECT_ID });

		const privateRoot = await folders.ensurePrivateRoot(OWNER_ID, PROJECT_ID);
		expect(await folders.getStoryFolderItem('story-a')).toEqual({ folderId: privateRoot });
		expect(await sharedStories.getSharedStoryInfo('story-a', PROJECT_ID)).toBeNull();
	});

	it('archives a folder tree with its stories and restores it', async () => {
		const parent = await folders.createFolder({ ownerId: OWNER_ID, projectId: PROJECT_ID, name: 'Parent' });
		const child = await folders.createFolder({
			ownerId: OWNER_ID,
			projectId: PROJECT_ID,
			name: 'Child',
			parentId: parent.id,
		});
		await prisma.storyFolderItem.create({ data: { storyId: 'story-a', folderId: child.id } });

		await folders.archiveFolder(parent.id);
		expect((await stories.getStoryById('story-a'))?.archivedAt).toBeInstanceOf(Date);
		expect((await folders.listFolderTree(OWNER_ID, PROJECT_ID, { archived: true })).map((f) => f.name)).toEqual([
			'Child',
			'Parent',
		]);
		expect(await folders.findReferencedFolder(OWNER_ID, PROJECT_ID, parent.id)).toBeNull();

		await folders.unarchiveFolder(OWNER_ID, PROJECT_ID, parent.id);
		expect((await stories.getStoryById('story-a'))?.archivedAt).toBeNull();
		expect((await folders.getFolderById(parent.id))?.parentId).toBeNull();
	});

	it('deletes a folder moving its stories and subfolders to its parent', async () => {
		const parent = await folders.createFolder({ ownerId: OWNER_ID, projectId: PROJECT_ID, name: 'Parent' });
		const middle = await folders.createFolder({
			ownerId: OWNER_ID,
			projectId: PROJECT_ID,
			name: 'Middle',
			parentId: parent.id,
		});
		const leaf = await folders.createFolder({
			ownerId: OWNER_ID,
			projectId: PROJECT_ID,
			name: 'Leaf',
			parentId: middle.id,
		});
		await prisma.storyFolderItem.create({ data: { storyId: 'story-a', folderId: middle.id } });

		await folders.deleteFolderMovingContentsToParent(middle.id);

		expect(await folders.getFolderById(middle.id)).toBeNull();
		expect((await folders.getFolderById(leaf.id))?.parentId).toBe(parent.id);
		expect(await folders.getStoryFolderItem('story-a')).toEqual({ folderId: parent.id });
	});

	it('rehomes an unarchived story: out of folders when shared project-wide, else in the private root', async () => {
		await folders.rehomeUnarchivedStory(OWNER_ID, PROJECT_ID, 'story-a');
		expect(await folders.getStoryFolderItem('story-a')).not.toBeNull();

		await sharedStories.createSharedStory({
			storyId: 'story-a',
			projectId: PROJECT_ID,
			userId: OWNER_ID,
			visibility: 'project',
		});
		await folders.rehomeUnarchivedStory(OWNER_ID, PROJECT_ID, 'story-a');
		expect(await folders.getStoryFolderItem('story-a')).toBeNull();
	});
});
