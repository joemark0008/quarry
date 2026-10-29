import pg from 'pg';

const { builtins } = pg.types;

/**
 * Port of `_convert_value` / `_column_values` in upstream `fastapi/main.py`: every warehouse value becomes a
 * JSON-safe value. Decimals become numbers (NaN/Infinity → null), dates and timestamps ISO-8601 strings,
 * bytes UTF-8 text. 64-bit integers stay numbers while they are exact, strings beyond that.
 */
export function toJsonSafe(value: unknown, dataTypeId?: number): unknown {
	if (value === null || value === undefined) {
		return null;
	}
	if (typeof value === 'string') {
		switch (dataTypeId) {
			case builtins.INT8:
				return bigIntegerValue(value);
			case builtins.NUMERIC:
				return finiteNumber(Number(value));
			case builtins.TIMESTAMP:
				return isoTimestamp(value);
			case builtins.TIMESTAMPTZ:
				return isoTimestamp(value);
			default:
				return value;
		}
	}
	if (typeof value === 'number') {
		return finiteNumber(value);
	}
	if (typeof value === 'bigint') {
		return bigIntegerValue(value.toString());
	}
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value.toISOString();
	}
	if (Buffer.isBuffer(value)) {
		return value.toString('utf8');
	}
	if (Array.isArray(value)) {
		return value.map((item) => toJsonSafe(item));
	}
	return value;
}

function finiteNumber(value: number): number | null {
	return Number.isFinite(value) ? value : null;
}

function bigIntegerValue(text: string): number | string {
	const parsed = Number(text);
	return Number.isSafeInteger(parsed) ? parsed : text;
}

/** `2018-01-01 00:00:00` → `2018-01-01T00:00:00`, `…+00` → `…+00:00` (Python `isoformat`). */
function isoTimestamp(text: string): string {
	if (text === 'infinity' || text === '-infinity') {
		return text;
	}
	return text.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
}
