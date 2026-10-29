import { describe, expect, it } from 'vitest';

import { explainAppDbError } from './app-db-errors.js';

describe('explainAppDbError', () => {
	it('tells the model how timestamps are stored when it compares one to an epoch', () => {
		const explained = explainAppDbError(
			new Error('operator does not exist: timestamp without time zone >= integer'),
		);
		expect(explained).toContain('not Unix epochs');
		expect(explained).toContain("date_trunc('day', created_at)");
	});

	it('adds the same hint when the model converts a timestamp with to_timestamp', () => {
		const explained = explainAppDbError(
			new Error('function to_timestamp(timestamp without time zone) does not exist'),
		);
		expect(explained).toContain('not Unix epochs');
	});

	it('leaves unrelated errors untouched', () => {
		expect(explainAppDbError(new Error('column "nope" does not exist'))).toBe('column "nope" does not exist');
	});
});
