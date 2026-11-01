import { describe, expect, it } from 'vitest';

import { parseContextExplorerPath, validateContextExplorerSearch } from './context-explorer-search';

describe('context explorer search', () => {
	it('keeps a safe file path for initial selection', () => {
		expect(validateContextExplorerSearch({ path: '/models/revenue.sql' })).toEqual({
			path: '/models/revenue.sql',
		});
		expect(parseContextExplorerPath('/RULES.md')).toBe('/RULES.md');
	});

	it.each([undefined, '', 'RULES.md', '/../RULES.md', '/folder/../RULES.md', '/folder\\RULES.md'])(
		'ignores unsafe or invalid path %s',
		(path) => {
			expect(validateContextExplorerSearch({ path })).toEqual({});
		},
	);

	it('drops unknown search params', () => {
		expect(validateContextExplorerSearch({ path: '/RULES.md', from: 'a'.repeat(40) })).toEqual({
			path: '/RULES.md',
		});
	});
});
