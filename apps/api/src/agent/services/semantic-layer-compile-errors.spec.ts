import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { ToolContext } from '../types/tools.js';
import { compileSemanticQuery, SemanticQueryCompileError } from './semantic-layer.service.js';

// Port of upstream `semantic-layer-compile-errors.test.ts`. Upstream stubbed the FastAPI response status; quarry
// compiles in process, so each status becomes the project state that produced it: 422 an unknown metric, 400 a
// missing or misconfigured layer, 500/503 an unloadable manifest.
const MANIFEST = path.join(import.meta.dirname, '../../semantic-layer/metricflow/__fixtures__/semantic_manifest.json');
const dirs: string[] = [];

afterEach(() => {
	while (dirs.length > 0) {
		fs.rmSync(dirs.pop() as string, { force: true, recursive: true });
	}
});

function project(configLines: string[], manifest: string | null = MANIFEST): ToolContext {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quarry-semantic-compile-'));
	dirs.push(dir);
	fs.writeFileSync(path.join(dir, 'quarry_config.yaml'), configLines.join('\n'));
	if (manifest) {
		fs.mkdirSync(path.join(dir, 'dbt/target'), { recursive: true });
		fs.copyFileSync(manifest, path.join(dir, 'dbt/target/semantic_manifest.json'));
	}
	return { projectFolder: dir, envVars: {} } as unknown as ToolContext;
}

const DATABASE = [
	'databases:',
	'  - name: warehouse',
	'    type: postgres',
	'    host: localhost',
	'    port: 5432',
	'    database: warehouse',
	'    user: quarry',
];
const LAYER = ['semantic_layer:', '  type: metricflow', '  manifest_path: dbt/target/semantic_manifest.json'];

describe('compileSemanticQuery errors', () => {
	it('raises a SemanticQueryCompileError when the layer rejects the query', async () => {
		const context = project(['project_name: demo', ...DATABASE, ...LAYER]);

		const error = await compileSemanticQuery({ metrics: ['no_such_metric'] }, context).catch((caught) => caught);

		expect(error).toBeInstanceOf(SemanticQueryCompileError);
		expect(error.message).toMatch(/^Error compiling semantic query: .*no_such_metric/s);
	});

	it.each([
		['no semantic layer', ['project_name: demo', ...DATABASE], MANIFEST],
		['a missing manifest', ['project_name: demo', ...DATABASE, ...LAYER], null],
		['an unknown database', ['project_name: demo', ...DATABASE, ...LAYER, '  database: other'], MANIFEST],
	])('raises a plain error for %s', async (_case, config, manifest) => {
		const context = project(config, manifest);

		const error = await compileSemanticQuery({ metrics: ['revenue'] }, context).catch((caught) => caught);

		expect(error).toBeInstanceOf(Error);
		expect(error).not.toBeInstanceOf(SemanticQueryCompileError);
	});

	it('compiles a query for the configured database', async () => {
		const context = project(['project_name: demo', ...DATABASE, ...LAYER]);

		const compiled = await compileSemanticQuery(
			{ metrics: ['revenue'], group_by: ['metric_time__month'] },
			context,
		);

		expect(compiled.database_id).toBe('warehouse');
		expect(compiled.dialect).toBe('postgres');
		expect(compiled.sql).toContain("DATE_TRUNC('month'");
	});
});
