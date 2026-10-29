import { Bold, Code, Span } from '../markdown/index.js';

/**
 * How the app-db views expose time (upstream `components/ai/app-db-timestamps.tsx`, PostgreSQL branch only:
 * quarry has no SQLite).
 */
export function AppDbTimestamps() {
	return (
		<Span>
			Timestamp columns (<Code>created_at</Code>, <Code>called_at</Code>, <Code>superseded_at</Code>) are native{' '}
			<Code>timestamp</Code> values, <Bold>not</Bold> Unix epochs, so never wrap them in{' '}
			<Code>to_timestamp()</Code> and never compare them to a number. Filter with{' '}
			<Code>created_at &gt;= now() - interval &apos;30 days&apos;</Code> and bucket with{' '}
			<Code>date_trunc(&apos;day&apos;, created_at)</Code>.
		</Span>
	);
}
