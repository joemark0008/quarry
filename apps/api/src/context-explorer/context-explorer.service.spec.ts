/** Port of upstream `tests/context-explorer.routes.test.ts`: the route handlers are `ContextExplorerService`. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getFileTree: vi.fn(),
	listUserGroups: vi.fn(),
	readFileContent: vi.fn(),
	writeFileContent: vi.fn(),
}));

vi.mock('./files/context-files.js', () => ({
	getFileTree: mocks.getFileTree,
	MAX_CONTEXT_FILE_SIZE: 1024 * 1024,
	readFileContent: mocks.readFileContent,
	searchFileContents: vi.fn(),
	writeFileContent: mocks.writeFileContent,
}));

import { Reflector } from '@nestjs/core';

import { ACCESS_KEY, type AccessRequirement } from '../common/decorators/access.decorator.js';
import type { ContextExplorerRepository } from './context-explorer.repository.js';
import { ContextExplorerResolver } from './context-explorer.resolver.js';
import { ContextExplorerService } from './context-explorer.service.js';

describe('context explorer file access', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('returns the project file tree', async () => {
		const entries = [
			{ name: 'folder', path: '/folder', type: 'directory', children: [] },
			{ name: 'quarry_config.yaml', path: '/quarry_config.yaml', type: 'file' },
		];
		mocks.getFileTree.mockResolvedValue(entries);

		await expect(createCaller().getFileTree()).resolves.toEqual({ entries });
		expect(mocks.getFileTree).toHaveBeenCalledWith('/tmp/quarry-project');
	});

	it('reads and writes files in the project folder', async () => {
		mocks.readFileContent.mockResolvedValue({ content: 'source\n', hash: 'hash', isEditable: true, reason: null });
		mocks.writeFileContent.mockResolvedValue({ hash: 'updated-hash' });

		await createCaller().readFile({ path: '/context.md' });
		expect(mocks.readFileContent).toHaveBeenCalledWith('/context.md', '/tmp/quarry-project');

		await createCaller().writeFile({ path: '/context.md', content: 'updated\n', expectedHash: '0'.repeat(64) });
		expect(mocks.writeFileContent).toHaveBeenCalledWith(
			'/context.md',
			'updated\n',
			'0'.repeat(64),
			'/tmp/quarry-project',
		);
	});

	it('rejects a write with an invalid expected hash', async () => {
		await expect(
			createCaller().writeFile({ path: '/context.md', content: 'updated\n', expectedHash: 'nope' }),
		).rejects.toMatchObject({ codeMessage: 'BAD_REQUEST' });
		expect(mocks.writeFileContent).not.toHaveBeenCalled();
	});

	it('rejects projects without a path', async () => {
		const service = new ContextExplorerService({} as ContextExplorerRepository);
		await expect(service.getFileTree({ id: 'project-id', path: null })).rejects.toMatchObject({
			codeMessage: 'BAD_REQUEST',
		});
	});
});

describe('context explorer RULES preview groups', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('returns only minimal groups from the selected project to a context admin', async () => {
		mocks.listUserGroups.mockResolvedValue([
			{
				id: 'default-id',
				name: 'All Users',
				isDefault: true,
				featureGrants: ['storyCreation'],
				contextGrants: { mode: 'all' },
			},
			{
				id: 'finance-id',
				name: 'Finance',
				isDefault: false,
				featureGrants: [],
				contextGrants: { mode: 'restricted' },
			},
		]);

		await expect(createCaller().getRulesPreviewGroups()).resolves.toEqual({
			enforced: true,
			groups: [
				{ id: 'default-id', name: 'All Users', isDefault: true },
				{ id: 'finance-id', name: 'Finance', isDefault: false },
			],
		});
		expect(mocks.listUserGroups).toHaveBeenCalledWith('project-id');
	});

	it('returns enforced preview groups without unlimited entitlement', async () => {
		mocks.listUserGroups.mockResolvedValue([
			{ id: 'default-id', name: 'All Users', isDefault: true },
			{ id: 'finance-id', name: 'Finance', isDefault: false },
		]);

		await expect(createCaller().getRulesPreviewGroups()).resolves.toEqual({
			enforced: true,
			groups: [
				{ id: 'default-id', name: 'All Users', isDefault: true },
				{ id: 'finance-id', name: 'Finance', isDefault: false },
			],
		});
		expect(mocks.listUserGroups).toHaveBeenCalledWith('project-id');
	});

	it('rejects users without context administration access', () => {
		// quarry: the guard rejects any role missing from the resolver's access metadata.
		expect(accessRoles('contextRulesPreviewGroups')).not.toContain('user');
		expect(accessRoles('contextRulesPreviewGroups')).not.toContain('viewer');
	});
});

function createCaller() {
	const service = new ContextExplorerService({
		listActiveUserGroups: mocks.listUserGroups,
	} as unknown as ContextExplorerRepository);
	const project = { id: 'project-id', path: '/tmp/quarry-project' };
	return {
		getFileTree: () => service.getFileTree(project),
		getRulesPreviewGroups: () => service.getRulesPreviewGroups(project),
		readFile: (input: { path: string }) => service.readFile(project, input.path),
		writeFile: (input: unknown) => service.writeFile(project, input),
	};
}

function accessRoles(handler: keyof ContextExplorerResolver): readonly string[] | undefined {
	const reflector = new Reflector();
	const requirement = reflector.getAllAndOverride<AccessRequirement | undefined>(ACCESS_KEY, [
		ContextExplorerResolver.prototype[handler],
		ContextExplorerResolver,
	]);
	return requirement?.kind === 'project' ? requirement.roles : undefined;
}
