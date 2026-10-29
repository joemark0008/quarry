import os from 'node:os';
import path from 'node:path';

import type { UserRulesGroupAccess } from '@quarry/shared/rules-template';
import type { Tool } from 'ai';
import fs from 'fs/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WarehouseTableAccess } from '../services/context-access.js';
import type {
	ResolvedDocsContextAccess,
	ResolvedFilesContextAccess,
} from '../services/user-group-context-access.service.js';
import type { ToolContext } from '../types/tools.js';
import grepTool from './grep.js';
import listTool from './list.js';
import readTool from './read.js';
import searchTool from './search.js';

/**
 * Port of upstream `storage-tools.test.ts`, project-folder cases only. quarry has no permanent storage
 * (`/home`) nor `write` tool yet (Phase 2d stand-ins in `services/storage*`), so the cases that write to or
 * read from `/home`, or that switch storage backends, are left out.
 */

let outsideRoot: string;
let projectFolder: string;
let warehouseTableAccess: WarehouseTableAccess;
let docsContextAccess: ResolvedDocsContextAccess;
let filesContextAccess: ResolvedFilesContextAccess;
const userRulesGroupAccess: UserRulesGroupAccess = { enforced: false };
const STORY_LIBRARY_ENTRY = { path: '/story-library', name: 'story-library', type: 'directory' };

const context = () =>
	({
		projectFolder,
		projectId: 'proj-1',
		userId: 'user-1',
		warehouseTableAccess,
		warehouseRowSecurity: { enforced: false },
		docsContextAccess,
		filesContextAccess,
		mcpAccess: { mode: 'all' },
		userGroupFeatures: [],
		userRulesGroupAccess,
	}) as unknown as ToolContext;

beforeEach(async () => {
	outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'nao-storage-tools-'));
	projectFolder = await fs.mkdtemp(path.join(os.tmpdir(), 'nao-project-tools-'));
	warehouseTableAccess = { enforced: false };
	docsContextAccess = { enforced: false };
	filesContextAccess = { enforced: false };
});

afterEach(async () => {
	await fs.rm(outsideRoot, { recursive: true, force: true });
	await fs.rm(projectFolder, { recursive: true, force: true });
});

describe('read', () => {
	it('still reads a project file', async () => {
		await fs.writeFile(path.join(projectFolder, 'RULES.md'), 'project rules');

		expect(await run(readTool, { file_path: '/RULES.md' })).toMatchObject({ content: 'project rules' });
	});
});

describe('docs context access', () => {
	beforeEach(async () => {
		await fs.mkdir(path.join(projectFolder, 'docs', 'allowed'), { recursive: true });
		await fs.mkdir(path.join(projectFolder, 'docs', 'legal'), { recursive: true });
		await fs.mkdir(path.join(projectFolder, 'docs', 'private'), { recursive: true });
		await fs.writeFile(path.join(projectFolder, 'docs', 'allowed', 'report.md'), 'shared needle');
		await fs.writeFile(path.join(projectFolder, 'docs', 'legal', 'terms.md'), 'legal needle');
		await fs.writeFile(path.join(projectFolder, 'docs', 'legal', 'private.md'), 'private needle');
		await fs.writeFile(path.join(projectFolder, 'docs', 'private', 'secret.md'), 'secret needle');
		docsContextAccess = {
			enforced: true,
			access: {
				mode: 'restricted',
				grants: [
					{ kind: 'folder', path: 'allowed' },
					{ kind: 'file', path: 'legal/terms.md' },
				],
			},
		};
	});

	it('allows direct granted reads and denies siblings', async () => {
		await expect(run(readTool, { file_path: '/docs/allowed/report.md' })).resolves.toMatchObject({
			content: 'shared needle',
		});
		await expect(run(readTool, { file_path: '/docs/legal/terms.md' })).resolves.toMatchObject({
			content: 'legal needle',
		});
		await expect(run(readTool, { file_path: '/docs/legal/private.md' })).rejects.toThrow('Access denied');
		await expect(run(readTool, { file_path: '/docs/private/secret.md' })).rejects.toThrow('Access denied');
	});

	it('maps a nested docs grant below the outer docs root', async () => {
		await fs.mkdir(path.join(projectFolder, 'docs', 'docs'));
		await fs.writeFile(path.join(projectFolder, 'docs', 'docs', 'nested.md'), 'nested');
		docsContextAccess = {
			enforced: true,
			access: { mode: 'restricted', grants: [{ kind: 'folder', path: 'docs' }] },
		};

		await expect(run(readTool, { file_path: '/docs/docs/nested.md' })).resolves.toMatchObject({
			content: 'nested',
		});
		await expect(run(readTool, { file_path: '/docs/legal/terms.md' })).rejects.toThrow('Access denied');
	});

	it('lists only traversable ancestors and allowed children without leaking counts', async () => {
		await expect(run(listTool, { path: '/docs' })).resolves.toMatchObject({
			entries: [
				expect.objectContaining({ name: 'allowed', itemCount: 1 }),
				expect.objectContaining({ name: 'legal', itemCount: 1 }),
			],
		});
		const legal = (await run(listTool, { path: '/docs/legal' })) as { entries: Array<{ name: string }> };
		expect(legal.entries.map((entry) => entry.name)).toEqual(['terms.md']);
		await expect(run(listTool, { path: '/docs/private' })).rejects.toThrow('Access denied');
	});

	it('filters search and grep matches before totals and snippets are returned', async () => {
		const search = (await run(searchTool, { pattern: '*.md' })) as { files: Array<{ path: string }> };
		expect(
			search.files
				.map((file) => file.path)
				.filter((filePath) => filePath.startsWith('/docs'))
				.sort(),
		).toEqual(['/docs/allowed/report.md', '/docs/legal/terms.md']);

		const grep = (await run(grepTool, { pattern: 'needle' })) as {
			matches: Array<{ path: string }>;
			total_matches: number;
		};
		expect(
			grep.matches
				.map((match) => match.path)
				.filter((filePath) => filePath.startsWith('/docs'))
				.sort(),
		).toEqual(['/docs/allowed/report.md', '/docs/legal/terms.md']);
		expect(grep.total_matches).toBe(2);
	});

	it('counts all authorized grep matches after the result cap', async () => {
		await fs.writeFile(path.join(projectFolder, 'docs', 'allowed', 'report.md'), 'needle\nneedle\nneedle');
		await fs.writeFile(path.join(projectFolder, 'docs', 'private', 'secret.md'), 'needle\nneedle\nneedle\nneedle');

		const grep = (await run(grepTool, { pattern: 'needle', max_results: 1 })) as {
			matches: Array<{ path: string }>;
			total_matches: number;
			truncated: boolean;
		};
		expect(grep.matches).toHaveLength(1);
		expect(grep.total_matches).toBe(4);
		expect(grep.truncated).toBe(true);
	});
});

describe('list', () => {
	// Skipped: 'shows /home as a folder at the root of the tree', 'hides project folders named like a mount',
	// 'lists a folder inside /home' — permanent storage is not ported yet.

	it('omits /home when storage is disabled', async () => {
		expect(await run(listTool, { path: '/' })).toEqual({ _version: '1', entries: [STORY_LIBRARY_ENTRY] });
	});

	it('still lists the project folder', async () => {
		await fs.mkdir(path.join(projectFolder, 'databases'));

		expect(await run(listTool, { path: '/databases' })).toEqual({ _version: '1', entries: [] });
	});
});

describe('search', () => {
	// Skipped: the cases matching saved files under /home — permanent storage is not ported yet.

	it('refuses traversal in a pattern', async () => {
		await expect(run(searchTool, { pattern: '../**' })).rejects.toThrow("'..' is not allowed");
	});

	it('returns the matched path instead of its canonical symlink target', async () => {
		const target = path.join(projectFolder, 'target.md');
		await fs.writeFile(target, 'target');
		await fs.symlink(target, path.join(projectFolder, 'alias.md'));

		expect(await run(searchTool, { pattern: 'alias.md' })).toEqual({
			_version: '1',
			files: [{ path: '/alias.md', dir: '/', size: '6' }],
		});
	});

	it('omits a symlinked project file when project files are restricted', async () => {
		const target = path.join(projectFolder, 'target.md');
		await fs.writeFile(target, 'target');
		await fs.symlink(target, path.join(projectFolder, 'alias.md'));
		filesContextAccess = {
			enforced: true,
			access: { mode: 'restricted', grants: [{ kind: 'file', path: 'alias.md' }] },
		};

		expect(await run(searchTool, { pattern: 'alias.md' })).toEqual({ _version: '1', files: [] });
	});
});

describe('grep', () => {
	// Skipped: the cases grepping saved files under /home or switching storage backends — not ported yet.
	beforeEach(async () => {
		await fs.writeFile(path.join(projectFolder, 'RULES.md'), 'revenue is net of refunds');
	});

	const pathsMatching = async (input: { pattern: string; path?: string }) => {
		const output = (await run(grepTool, input)) as { matches: { path: string }[] };
		return output.matches.map((match) => match.path);
	};

	it('can be scoped to the project', async () => {
		expect(await pathsMatching({ pattern: 'revenue', path: '/' })).toEqual(['/RULES.md']);
	});

	it('returns no matches for an explicit missing project path', async () => {
		expect(await run(grepTool, { pattern: 'revenue', path: '/missing' })).toEqual({
			_version: '1',
			matches: [],
			total_matches: 0,
			truncated: false,
		});
	});

	it('leaves saved files out when storage is disabled', async () => {
		expect(await pathsMatching({ pattern: 'revenue' })).toEqual(['/RULES.md']);
	});
});

describe('database Context permissions', () => {
	beforeEach(async () => {
		const tableRoot = path.join(projectFolder, 'databases/type=postgres/database=analytics/schema=public');
		await fs.mkdir(path.join(tableRoot, 'table=orders'), { recursive: true });
		await fs.mkdir(path.join(tableRoot, 'table=users'), { recursive: true });
		await fs.writeFile(path.join(tableRoot, 'table=orders/columns.md'), 'allowed marker');
		await fs.writeFile(path.join(tableRoot, 'table=users/columns.md'), 'denied marker');
		warehouseTableAccess = {
			enforced: true,
			strict: false,
			tables: [
				{
					databaseType: 'postgres',
					database: 'analytics',
					schema: 'public',
					table: 'orders',
				},
			],
		};
	});

	it('blocks direct reads and lists of denied tables', async () => {
		const deniedTable = '/databases/type=postgres/database=analytics/schema=public/table=users';
		await expect(run(readTool, { file_path: `${deniedTable}/columns.md` })).rejects.toThrow('Access denied');
		await expect(run(listTool, { path: deniedTable })).rejects.toThrow('Access denied');
	});

	it('authorizes canonical paths after resolving traversal and symlinks', async () => {
		const schemaRoot = path.join(projectFolder, 'databases/type=postgres/database=analytics/schema=public');
		const allowedTable = path.join(schemaRoot, 'table=orders');
		const outsideFile = path.join(outsideRoot, 'outside.md');
		await fs.writeFile(outsideFile, 'outside marker');
		await fs.symlink('../table=users', path.join(allowedTable, 'users-link'));
		await fs.symlink(outsideFile, path.join(allowedTable, 'outside-link.md'));

		const traversedDeniedPath =
			'/databases/type=postgres/database=analytics/schema=public/table=orders/../table=users/columns.md';
		const deniedSymlinkPath =
			'/databases/type=postgres/database=analytics/schema=public/table=orders/users-link/columns.md';
		const outsideSymlinkPath =
			'/databases/type=postgres/database=analytics/schema=public/table=orders/outside-link.md';

		await expect(run(readTool, { file_path: traversedDeniedPath })).rejects.toThrow('Access denied');
		await expect(run(readTool, { file_path: deniedSymlinkPath })).rejects.toThrow('Access denied');
		await expect(run(readTool, { file_path: outsideSymlinkPath })).rejects.toThrow('Access denied');
		await expect(run(listTool, { path: path.dirname(deniedSymlinkPath) })).rejects.toThrow('Access denied');
		await expect(run(grepTool, { pattern: 'marker', path: path.dirname(deniedSymlinkPath) })).rejects.toThrow(
			'Access denied',
		);

		const listOutput = (await run(listTool, {
			path: '/databases/type=postgres/database=analytics/schema=public/table=orders',
		})) as { entries: { name: string }[] };
		expect(listOutput.entries.map((entry) => entry.name)).not.toContain('users-link');
		expect(listOutput.entries.map((entry) => entry.name)).not.toContain('outside-link.md');

		const searchOutput = (await run(searchTool, { pattern: '*link*' })) as {
			files: { path: string }[];
		};
		expect(searchOutput.files).toEqual([]);
	});

	it('fails malformed database hierarchies closed without blocking ordinary files', async () => {
		await fs.writeFile(path.join(projectFolder, 'notes.md'), 'ordinary context');

		await expect(
			run(readTool, {
				file_path: '/databases/type=postgres/not-a-database/schema=public/table=orders/columns.md',
			}),
		).rejects.toThrow('Access denied');
		await expect(run(listTool, { path: '/databases/not-a-type' })).rejects.toThrow('Access denied');
		await expect(run(readTool, { file_path: '/notes.md' })).resolves.toMatchObject({
			content: 'ordinary context',
		});
	});

	it('filters denied table branches from directory listings', async () => {
		const output = (await run(listTool, {
			path: '/databases/type=postgres/database=analytics/schema=public',
		})) as { entries: { name: string }[] };

		expect(output.entries.map((entry) => entry.name)).toEqual(['table=orders']);
	});

	it('filters denied files from search and grep results', async () => {
		const searchOutput = (await run(searchTool, { pattern: 'columns.md' })) as {
			files: { path: string }[];
		};
		expect(searchOutput.files.map((file) => file.path)).toEqual([
			'/databases/type=postgres/database=analytics/schema=public/table=orders/columns.md',
		]);

		const grepOutput = (await run(grepTool, { pattern: 'marker' })) as {
			matches: { path: string }[];
		};
		expect(grepOutput.matches.map((match) => match.path)).toEqual([
			'/databases/type=postgres/database=analytics/schema=public/table=orders/columns.md',
		]);
	});
});

// Skipped: 'when permanent storage is disabled' — quarry's storage stand-in has its own error message
// ("Saved files are not available") and lists /home as empty instead of failing.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function run<TInput>(tool: Tool<TInput, any>, input: TInput) {
	return tool.execute!(input, {
		experimental_context: context(),
	} as Parameters<NonNullable<typeof tool.execute>>[1]);
}
