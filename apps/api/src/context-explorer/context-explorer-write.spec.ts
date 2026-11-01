import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
	process.env.MODE = 'test';
	process.env.QUARRY_DEFAULT_PROJECT_PATH = '';
});

import {
	getFileTree,
	MAX_CONTEXT_FILE_SIZE,
	readFileContent,
	searchFileContents,
	writeFileContent,
} from './files/context-files.js';

describe('context explorer project folder writes', () => {
	let root: string;
	let project: string;

	beforeEach(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), 'quarry-context-write-'));
		project = path.join(root, 'project');
		fs.mkdirSync(project);
		writeFiles(project, {
			'quarry_config.yaml': 'name: project\n',
			'context.md': 'project content\n',
			'generated.md': '---\ntype: generated\n---\ngenerated\n',
			'annotations.md': '---\ntype: manual\n---\nnotes\n',
			'rendered.md': 'rendered\n',
			'rendered.md.j2': 'template\n',
			'repos/source.md': 'synced\n',
			'docs/notion/page.md': 'notion\n',
			'docs/confluence/page.md': 'confluence\n',
			'docs/obsidian/note.md': 'obsidian\n',
			'.env': 'secret\n',
			'nested/.env.local': 'nested secret\n',
			'nested/repository/.git/config': 'protected\n',
		});
	});

	afterEach(() => {
		fs.rmSync(root, { recursive: true, force: true });
	});

	it('reads and writes content in the project folder with optimistic locking', async () => {
		const original = await readFileContent('/context.md', project);
		const result = await writeFileContent('/context.md', 'updated\n', original.hash, project);
		const updated = await readFileContent('/context.md', project);

		expect(original).toMatchObject({ content: 'project content\n', isEditable: true, reason: null });
		expect(updated.content).toBe('updated\n');
		expect(fs.readFileSync(path.join(project, 'context.md'), 'utf8')).toBe('updated\n');
		expect(result.hash).toBe(updated.hash);
		await expect(writeFileContent('/context.md', 'stale\n', original.hash, project)).rejects.toMatchObject({
			codeMessage: 'CONFLICT',
		});
	});

	it('returns every editability reason with actionable guidance in precedence order', async () => {
		const generated = await readFileContent('/generated.md', project);
		const rendered = await readFileContent('/rendered.md', project);
		const repoSource = await readFileContent('/repos/source.md', project);
		const notion = await readFileContent('/docs/notion/page.md', project);

		expect(generated).toMatchObject({
			reason: 'generated',
			guidance: { actionKind: 'file', actionPath: '/annotations.md' },
		});
		expect(rendered).toMatchObject({
			reason: 'rendered-template',
			guidance: { actionKind: 'file', actionPath: '/rendered.md.j2' },
		});
		expect(repoSource).toMatchObject({
			reason: 'synced-source',
			guidance: { actionKind: 'file', actionPath: '/quarry_config.yaml' },
		});
		expect(notion.reason).toBe('synced-source');
	});

	it('excludes and rejects .git and environment files across tree, read, write, and search', async () => {
		const tree = await getFileTree(project);
		const nested = tree.find((entry) => entry.name === 'nested');
		const context = await readFileContent('/context.md', project);

		expect(tree.map((entry) => entry.name)).not.toEqual(expect.arrayContaining(['.git', '.env']));
		expect(nested?.children?.map((entry) => entry.name)).not.toContain('.env.local');
		for (const protectedPath of ['/nested/repository/.git/config', '/.env', '/nested/.env.local']) {
			await expect(readFileContent(protectedPath, project)).rejects.toMatchObject({ codeMessage: 'FORBIDDEN' });
			await expect(writeFileContent(protectedPath, 'changed\n', context.hash, project)).rejects.toMatchObject({
				codeMessage: 'FORBIDDEN',
			});
		}
		expect((await searchFileContents('secret', project)).results).toEqual([]);
	});

	it('rejects traversal, symlinks, oversized and non-UTF-8 files', async () => {
		const context = await readFileContent('/context.md', project);
		const outside = path.join(root, 'outside.md');
		fs.writeFileSync(outside, 'outside\n');
		fs.symlinkSync(outside, path.join(project, 'linked.md'));
		fs.writeFileSync(path.join(project, 'binary.md'), Buffer.from([0xff, 0xfe]));

		await expect(writeFileContent('../outside.md', 'changed\n', context.hash, project)).rejects.toMatchObject({
			codeMessage: 'FORBIDDEN',
		});
		await expect(writeFileContent('/linked.md', 'changed\n', context.hash, project)).rejects.toMatchObject({
			codeMessage: 'FORBIDDEN',
		});
		await expect(
			writeFileContent('/context.md', 'a'.repeat(MAX_CONTEXT_FILE_SIZE + 1), context.hash, project),
		).rejects.toMatchObject({ codeMessage: 'BAD_REQUEST' });
		await expect(readFileContent('/binary.md', project)).rejects.toMatchObject({ codeMessage: 'BAD_REQUEST' });
		expect(fs.readFileSync(outside, 'utf8')).toBe('outside\n');
	});

	it('preserves file mode and permits only one concurrent atomic write', async () => {
		const target = path.join(project, 'context.md');
		fs.chmodSync(target, 0o600);
		const original = await readFileContent('/context.md', project);
		const results = await Promise.allSettled([
			writeFileContent('/context.md', 'first\n', original.hash, project),
			writeFileContent('/context.md', 'second\n', original.hash, project),
		]);

		expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
		expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
		expect(fs.statSync(target).mode & 0o777).toBe(0o600);
	});

	it.each([
		['/generated.md', 'generated', 'file', '/annotations.md'],
		['/rendered.md', 'rendered-template', 'file', '/rendered.md.j2'],
		['/repos/source.md', 'synced-source', 'file', '/quarry_config.yaml'],
		['/docs/notion/page.md', 'synced-source', 'file', '/quarry_config.yaml'],
		['/docs/confluence/page.md', 'synced-source', 'file', '/quarry_config.yaml'],
		['/docs/obsidian/note.md', 'synced-source', 'file', '/quarry_config.yaml'],
	])('reports guidance for %s', async (filePath, reason, actionKind, actionPath) => {
		const file = await readFileContent(filePath, project);
		expect(file.reason).toBe(reason);
		expect(file.guidance?.actionKind).toBe(actionKind);
		expect(file.guidance?.actionPath).toBe(actionPath);
	});

	it.each(['/generated.md', '/rendered.md', '/repos/source.md'])('rejects read-only write %s', async (filePath) => {
		const file = await readFileContent(filePath, project);
		await expect(writeFileContent(filePath, 'changed\n', file.hash, project)).rejects.toMatchObject({
			codeMessage: 'FORBIDDEN',
		});
	});
});

function writeFiles(root: string, files: Record<string, string>): void {
	for (const [filePath, content] of Object.entries(files)) {
		const target = path.join(root, filePath);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, content);
	}
}
