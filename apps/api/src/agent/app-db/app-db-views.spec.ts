import nodeSqlParser from 'node-sql-parser';
import { describe, expect, it } from 'vitest';

import { getScopedViews } from './app-db-views.js';

describe('scoped app-db views', () => {
	it('exposes exactly the columns it declares', () => {
		for (const view of getScopedViews()) {
			expect({ view: view.name, columns: selectListNames(view.body) }).toEqual({
				view: view.name,
				columns: view.columns,
			});
		}
	});
});

interface SelectColumn {
	as: string | null;
	expr?: { value?: string; column?: string | { expr: { value: string } } };
}

/** Output names of a SELECT's top-level select list, in order. */
function selectListNames(body: string): string[] {
	const parser = new nodeSqlParser.Parser();
	const ast = parser.astify(body, { database: 'postgresql' }) as unknown as { columns: SelectColumn[] };
	return ast.columns.map(outputName);
}

/** The Postgres parser describes a bare column as a nested column ref (upstream also covered SQLite's shape). */
function outputName({ as, expr }: SelectColumn): string {
	if (as) {
		return as;
	}
	const column = expr?.column;
	if (typeof column === 'string') {
		return column;
	}
	return column?.expr?.value ?? expr?.value ?? '';
}
