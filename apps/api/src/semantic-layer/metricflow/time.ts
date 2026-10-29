import { SemanticQueryError } from './errors.js';

/** MetricFlow's standard granularities, finest first. */
export const GRAINS = ['millisecond', 'second', 'minute', 'hour', 'day', 'week', 'month', 'quarter', 'year'] as const;

export type Grain = (typeof GRAINS)[number];

/** The granularities a query can name as a suffix (`metric_time__month`). */
export const DATE_GRAINS: Grain[] = ['day', 'week', 'month', 'quarter', 'year'];

export function isGrain(value: string | null | undefined): value is Grain {
	return typeof value === 'string' && (GRAINS as readonly string[]).includes(value);
}

export function grainRank(grain: Grain): number {
	return GRAINS.indexOf(grain);
}

export function toGrain(value: string | null | undefined, fallback: Grain = 'day'): Grain {
	const normalized = value?.toLowerCase();
	return isGrain(normalized) ? normalized : fallback;
}

/** A parsed `start_time` / `end_time`, kept as UTC calendar parts so no local time zone leaks in. */
export interface QueryTime {
	date: Date;
	hasTime: boolean;
}

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?(?:Z|[+-]\d{2}:?\d{2})?$/;

/** Port of `_parse_time`: empty means unbounded, anything not a date is the caller's mistake. */
export function parseQueryTime(value: string | null | undefined, name: string): QueryTime | null {
	if (value === null || value === undefined || value.trim() === '') {
		return null;
	}
	const text = value.trim();
	const invalid = () => new SemanticQueryError(`Invalid ${name} \`${value}\`: use an ISO date such as 2024-01-31.`);
	const iso = ISO_PATTERN.exec(text);
	if (iso) {
		const [, year, month, day, hour = '0', minute = '0', second = '0'] = iso;
		const date = new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second));
		if (date.getUTCMonth() !== +month - 1 || date.getUTCDate() !== +day || +hour > 23 || +minute > 59) {
			throw invalid();
		}
		return { date, hasTime: date.getUTCHours() + date.getUTCMinutes() + date.getUTCSeconds() > 0 };
	}
	// dateutil also reads forms like "Jan 31 2024"; JS does too, as long as a year is in there.
	const parsed = /\d{4}/.test(text) ? new Date(text) : new Date(Number.NaN);
	if (Number.isNaN(parsed.getTime())) {
		throw invalid();
	}
	const date = new Date(
		Date.UTC(
			parsed.getFullYear(),
			parsed.getMonth(),
			parsed.getDate(),
			parsed.getHours(),
			parsed.getMinutes(),
			parsed.getSeconds(),
		),
	);
	return { date, hasTime: parsed.getHours() + parsed.getMinutes() + parsed.getSeconds() > 0 };
}

/** First day of the period containing `date` (weeks start on Monday, as Postgres `DATE_TRUNC('week', …)`). */
export function startOfPeriod(date: Date, grain: Grain): Date {
	const year = date.getUTCFullYear();
	const month = date.getUTCMonth();
	switch (grain) {
		case 'year':
			return new Date(Date.UTC(year, 0, 1));
		case 'quarter':
			return new Date(Date.UTC(year, month - (month % 3), 1));
		case 'month':
			return new Date(Date.UTC(year, month, 1));
		case 'week': {
			const day = new Date(Date.UTC(year, month, date.getUTCDate()));
			const offset = (day.getUTCDay() + 6) % 7;
			return new Date(day.getTime() - offset * 86_400_000);
		}
		default:
			return new Date(Date.UTC(year, month, date.getUTCDate()));
	}
}

/** Last day of the period containing `date`. */
export function endOfPeriod(date: Date, grain: Grain): Date {
	const start = startOfPeriod(date, grain);
	const year = start.getUTCFullYear();
	const month = start.getUTCMonth();
	switch (grain) {
		case 'year':
			return new Date(Date.UTC(year + 1, 0, 0));
		case 'quarter':
			return new Date(Date.UTC(year, month + 3, 0));
		case 'month':
			return new Date(Date.UTC(year, month + 1, 0));
		case 'week':
			return new Date(start.getTime() + 6 * 86_400_000);
		default:
			return start;
	}
}

export function formatQueryTime(time: QueryTime): string {
	const iso = time.date.toISOString();
	return time.hasTime ? `${iso.slice(0, 10)} ${iso.slice(11, 19)}` : iso.slice(0, 10);
}
