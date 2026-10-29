import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	assertCanShareToProject: vi.fn(),
	getAgent: vi.fn(),
	getFolderById: vi.fn(),
	getStoryById: vi.fn(),
	getStoryOwnerId: vi.fn(),
	getStoryProjectId: vi.fn(),
	moveItemsToFolder: vi.fn(),
	proposedParentChainContains: vi.fn(),
}));

const SystemFolderError = vi.hoisted(
	() =>
		class extends Error {
			constructor() {
				super('System folders cannot be modified.');
			}
		},
);

vi.mock('../story-queries.js', () => ({
	db: {},
	projectQueries: { getUserRoleInProject: vi.fn(async () => 'user') },
	storyQueries: {
		getStoryById: mocks.getStoryById,
		getStoryOwnerId: mocks.getStoryOwnerId,
		getStoryProjectId: mocks.getStoryProjectId,
	},
	storyFolderQueries: {
		MoveFolderCycleError: class extends Error {
			constructor() {
				super('Moving this folder would create a cycle.');
			}
		},
		SystemFolderError,
		getFolderById: mocks.getFolderById,
		moveItemsToFolder: mocks.moveItemsToFolder,
		proposedParentChainContains: mocks.proposedParentChainContains,
	},
	storyRuntime: { isAgentRunning: (chatId: string) => mocks.getAgent(chatId) !== undefined },
}));
vi.mock('../services/share-audience.js', () => ({
	getShareAudience: vi.fn(),
	assertAudienceIncludesProject: mocks.assertCanShareToProject,
}));

import type { Project } from '../../generated/prisma/client.js';
import { runProcedure } from '../procedure.js';
import { storyFolderRoutes } from './story-folder.procedures.js';

/** Port of upstream `tests/story-folder-bulk-move.test.ts`; the tRPC caller is `runProcedure`. */

describe('storyFolder.bulkMove', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getFolderById.mockImplementation(async (id: string) => buildFolder(id));
		mocks.getStoryProjectId.mockResolvedValue('project-id');
		mocks.getStoryOwnerId.mockResolvedValue('user-id');
		mocks.getStoryById.mockImplementation(async (id: string) => ({ id, chatId: `chat-${id}` }));
		mocks.getAgent.mockReturnValue(undefined);
		mocks.proposedParentChainContains.mockResolvedValue(false);
	});

	it('moves every selected folder and story into the target folder in one batch', async () => {
		await bulkMove({
			storyIds: ['story-a', 'story-b'],
			folderIds: ['folder-a'],
			targetFolderId: 'target',
		});

		expect(mocks.moveItemsToFolder).toHaveBeenCalledTimes(1);
		expect(mocks.moveItemsToFolder).toHaveBeenCalledWith(
			'user-id',
			'project-id',
			{
				folderIds: ['folder-a'],
				stories: [
					{ storyId: 'story-a', storyOwnerId: 'user-id' },
					{ storyId: 'story-b', storyOwnerId: 'user-id' },
				],
			},
			'target',
		);
	});

	it('moves nothing when the target sits inside a selected folder', async () => {
		mocks.proposedParentChainContains.mockImplementation(
			async (_targetId: string, folderId: string) => folderId === 'folder-b',
		);

		await expect(
			bulkMove({
				storyIds: ['story-a'],
				folderIds: ['folder-a', 'folder-b'],
				targetFolderId: 'target',
			}),
		).rejects.toMatchObject({ codeMessage: 'BAD_REQUEST' });

		expect(mocks.moveItemsToFolder).not.toHaveBeenCalled();
	});

	it('moves nothing when the agent is editing a selected story', async () => {
		mocks.getAgent.mockImplementation((chatId: string) => (chatId === 'chat-story-b' ? {} : undefined));

		await expect(
			bulkMove({
				storyIds: ['story-a', 'story-b'],
				folderIds: ['folder-a'],
				targetFolderId: 'target',
			}),
		).rejects.toMatchObject({ codeMessage: 'CONFLICT' });

		expect(mocks.moveItemsToFolder).not.toHaveBeenCalled();
	});

	it('reports a system folder in the selection as forbidden', async () => {
		mocks.moveItemsToFolder.mockRejectedValue(new SystemFolderError());

		await expect(
			bulkMove({
				storyIds: [],
				folderIds: ['folder-a', 'private-root'],
				targetFolderId: null,
			}),
		).rejects.toMatchObject({ codeMessage: 'FORBIDDEN' });
	});

	it('rejects an empty selection', async () => {
		await expect(bulkMove({ storyIds: [], folderIds: [], targetFolderId: null })).rejects.toMatchObject({
			codeMessage: 'BAD_REQUEST',
		});
	});
});

function buildFolder(id: string) {
	return { id, projectId: 'project-id', ownerId: 'user-id', visibility: 'public', systemType: null };
}

function bulkMove(input: unknown) {
	return runProcedure(
		storyFolderRoutes,
		'bulkMove',
		{
			user: { id: 'user-id', name: 'Test User', email: 'test@example.com' } as never,
			project: { id: 'project-id', name: 'Project', orgId: 'org-id' } as Project,
			userRole: 'user',
		},
		input,
	);
}
