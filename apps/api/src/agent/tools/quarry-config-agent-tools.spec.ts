import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { list } from '@quarry/shared/tools';
import type { Tool } from 'ai';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { __reloadEnvForTesting, __resetStorageForTesting } from '../services/storage.js';
import type { ToolContext } from '../types/tools.js';
import grepTool from './grep.js';
import listTool from './list.js';
import readTool from './read.js';

// Upstream also forces BETA_CUSTOM_STORIES_ENABLED=false; quarry's custom stories are a stand-in that is always off.

const SECRET = 'sk-live-do-not-leak';

let projectFolder: string;
let originalEnv: typeof process.env;

beforeEach(() => {
	originalEnv = { ...process.env };
	process.env.QUARRY_STORAGE_BACKEND = 'none';
	__reloadEnvForTesting();
	__resetStorageForTesting();
	projectFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'quarry-config-tools-'));
	fs.writeFileSync(path.join(projectFolder, 'quarry_config.yaml'), `llm:\n  api_key: ${SECRET}\n`);
	fs.writeFileSync(path.join(projectFolder, 'RULES.md'), 'Rules\n');
	fs.mkdirSync(path.join(projectFolder, 'repos', 'other'), { recursive: true });
	fs.writeFileSync(path.join(projectFolder, 'repos', 'other', 'quarry_config.yaml'), `api_key: ${SECRET}\n`);
	fs.symlinkSync(path.join(projectFolder, 'quarry_config.yaml'), path.join(projectFolder, 'alias.yaml'));
});

afterEach(() => {
	process.env = originalEnv;
	__reloadEnvForTesting();
	__resetStorageForTesting();
	fs.rmSync(projectFolder, { recursive: true, force: true });
});

describe('quarry_config.yaml is hidden from the agent file tools', () => {
	it.each(['/quarry_config.yaml', 'quarry_config.yaml', '/repos/other/quarry_config.yaml', '/alias.yaml'])(
		'read denies %s',
		async (filePath) => {
			await expect(run(readTool, { file_path: filePath }, context())).rejects.toThrow('Access denied');
		},
	);

	it('list omits it', async () => {
		// `list.Output` also covers the legacy array shape; the tool always returns the versioned one.
		const output = (await run(listTool, { path: '/' }, context())) as Extract<list.Output, { _version: '1' }>;

		expect(output.entries.map((entry) => entry.name)).toContain('RULES.md');
		expect(output.entries.map((entry) => entry.name)).not.toContain('quarry_config.yaml');
	});

	it('grep never matches inside it', async () => {
		const wholeProject = await run(grepTool, { pattern: SECRET }, context());
		expect(wholeProject).toMatchObject({ matches: [], total_matches: 0 });

		await expect(run(grepTool, { pattern: SECRET, path: '/quarry_config.yaml' }, context())).rejects.toThrow(
			'Access denied',
		);
	});
});

function context(): ToolContext {
	return {
		projectFolder,
		warehouseTableAccess: { enforced: false },
		docsContextAccess: { enforced: false },
		filesContextAccess: { enforced: false },
		mcpAccess: { mode: 'all' },
		userRulesGroupAccess: { enforced: false },
	} as unknown as ToolContext;
}

async function run<TInput, TOutput>(
	tool: Tool<TInput, TOutput>,
	input: TInput,
	toolContext: ToolContext,
): Promise<TOutput> {
	return tool.execute!(input, {
		experimental_context: toolContext,
	} as Parameters<NonNullable<typeof tool.execute>>[1]) as Promise<TOutput>;
}
