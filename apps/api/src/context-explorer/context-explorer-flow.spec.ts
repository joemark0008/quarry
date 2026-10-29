import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ownership = vi.hoisted(() => {
	const owners = new Map<string, string>();
	return {
		owners,
		claimContextBranch: async (projectId: string, branch: string, userId: string) => {
			const key = `${projectId}:${branch}`;
			if (owners.has(key)) {
				return false;
			}
			owners.set(key, userId);
			return true;
		},
		releaseContextBranch: async (projectId: string, branch: string) => {
			owners.delete(`${projectId}:${branch}`);
		},
		getOwnedContextBranches: async (projectId: string, userId: string) =>
			new Set(
				[...owners]
					.filter(([key, owner]) => key.startsWith(`${projectId}:`) && owner === userId)
					.map(([key]) => key.slice(projectId.length + 1)),
			),
		isContextBranchOwnedByUser: async (projectId: string, branch: string, userId: string) =>
			owners.get(`${projectId}:${branch}`) === userId,
		getContextBranchReviewRequest: async () => null,
		setContextBranchReviewRequest: async () => undefined,
		getConfig: async () => null,
		updateConfig: async () => undefined,
		getGithubToken: async () => null,
		getGitlabToken: async () => null,
	};
});

vi.mock('./context-explorer.queries.js', () => ownership);

import { __reloadContextEnvForTesting } from './context-env.js';
import type { ContextExplorerRepository } from './context-explorer.repository.js';
import { ContextExplorerService } from './context-explorer.service.js';

/**
 * Phase 3 "done when": an admin edits a context file in the explorer, commits it on a branch, pushes it, the branch
 * is merged on the remote, and pulling the live context puts the edit in the project folder the agent reads. Runs
 * the real generic Git provider against a local bare repository (`QUARRY_CONTEXT_SOURCE=git`).
 */
describe('context explorer edit → commit → push → live pull', () => {
	const temporaryRoots: string[] = [];
	let originalEnv: typeof process.env;

	beforeEach(() => {
		originalEnv = { ...process.env };
		ownership.owners.clear();
	});

	afterEach(() => {
		process.env = originalEnv;
		__reloadContextEnvForTesting();
		for (const root of temporaryRoots.splice(0)) {
			fs.rmSync(root, { recursive: true, force: true });
		}
	});

	it('brings an explorer edit into the live project folder once its branch is merged', async () => {
		const root = fs.mkdtempSync(path.join(os.tmpdir(), 'quarry-context-flow-'));
		temporaryRoots.push(root);
		const bare = path.join(root, 'remote.git');
		const seed = path.join(root, 'seed');
		const live = path.join(root, 'live');
		fs.mkdirSync(seed);
		runGit(seed, ['init', '--quiet', '--initial-branch=main']);
		fs.writeFileSync(path.join(seed, 'nao_config.yaml'), 'project_name: flow\n');
		fs.writeFileSync(path.join(seed, 'RULES.md'), 'Revenue is the order amount.\n');
		commitAll(seed, 'initial context');
		runGit(root, ['init', '--bare', '--quiet', '--initial-branch=main', bare]);
		runGit(seed, ['push', '--quiet', bare, 'main']);
		runGit(root, ['clone', '--quiet', bare, live]);

		process.env.QUARRY_CONTEXT_SOURCE = 'git';
		process.env.QUARRY_CONTEXT_GIT_URL = bare;
		process.env.QUARRY_CONTEXT_GIT_BRANCH = 'main';
		process.env.QUARRY_CONTEXT_GIT_SSH_KEY = 'unused-for-local-remotes';
		__reloadContextEnvForTesting();

		const activities = { start: vi.fn(async () => ({ id: 'activity-id' })), complete: vi.fn(), fail: vi.fn() };
		const service = new ContextExplorerService({
			startContextPullActivity: activities.start,
			completeActivity: activities.complete,
			failActivity: activities.fail,
		} as unknown as ContextExplorerRepository);
		const project = { id: 'project-id', path: live };
		const admin = { id: 'admin-id', name: 'Admin', email: 'admin@example.com' };

		const status = await service.getRepositoryStatus(project, admin);
		expect(status).toMatchObject({ isGitRepository: true, repo: { provider: 'generic', branch: 'main' } });

		const opened = await service.readFile(project, admin, '/RULES.md');
		expect(opened).toMatchObject({ content: 'Revenue is the order amount.\n', isEditable: true });
		await service.writeFile(project, admin, {
			path: '/RULES.md',
			content: 'Revenue is the order amount, excluding returns.\n',
			expectedHash: opened.hash,
		});
		await expect(service.getChangedFiles(project, admin)).resolves.toEqual([
			expect.objectContaining({ path: '/RULES.md', kind: 'modified' }),
		]);

		const committed = await service.createBranchAndCommit(project, admin, {
			paths: ['/RULES.md'],
			message: 'Exclude returns from revenue',
		});
		await service.pushBranch(project, admin);
		expect(runGit(root, ['--git-dir', bare, 'branch', '--list', committed.branch]).toString()).toContain(
			committed.branch,
		);
		expect(fs.readFileSync(path.join(live, 'RULES.md'), 'utf8')).toBe('Revenue is the order amount.\n');

		runGit(seed, ['fetch', '--quiet', bare, committed.branch]);
		runGit(seed, ['merge', '--quiet', '--ff-only', 'FETCH_HEAD']);
		runGit(seed, ['push', '--quiet', bare, 'main']);

		const pulled = await service.pullLiveContext(project, admin);

		expect(pulled).toMatchObject({ changed: true, files: [{ path: '/RULES.md', additions: 1, deletions: 1 }] });
		expect(fs.readFileSync(path.join(live, 'RULES.md'), 'utf8')).toBe(
			'Revenue is the order amount, excluding returns.\n',
		);
		expect(activities.complete).toHaveBeenCalledWith('activity-id', expect.objectContaining({ changed: true }));
	});
});

function commitAll(folder: string, message: string): void {
	runGit(folder, ['add', '-A']);
	runGit(folder, ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '--quiet', '-m', message]);
}

function runGit(cwd: string, args: string[]): Buffer {
	return execFileSync('git', args, { cwd, stdio: 'pipe', timeout: 10_000 });
}
