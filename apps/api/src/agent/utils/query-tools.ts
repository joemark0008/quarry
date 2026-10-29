/** Tool names of upstream `queries/execute-sql.queries.ts`. */
export const EXECUTE_SQL_TOOL_NAME = 'execute_sql';
export const EXECUTE_SEMANTIC_QUERY_TOOL_NAME = 'execute_semantic_query';

/** Tools whose output is a query result addressable by `query_id` (charts, stories, read_query_result). */
export const QUERY_TOOL_NAMES = [EXECUTE_SQL_TOOL_NAME, EXECUTE_SEMANTIC_QUERY_TOOL_NAME] as const;
export type QueryToolName = (typeof QUERY_TOOL_NAMES)[number];
