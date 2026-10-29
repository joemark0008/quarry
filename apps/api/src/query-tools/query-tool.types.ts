import type { QueryToolParameter } from '@quarry/shared/query-tools';

/** What the agent needs to expose a saved tool (`agent/tools/saved-query-tool.ts`). */
export interface SavedQueryToolDefinition {
	id: string;
	name: string;
	description: string;
	sqlTemplate: string;
	parameters: QueryToolParameter[];
	databaseId: string | null;
}

/** What the service returns for a tool (the GraphQL `ProjectQueryTool`, `models/query-tool.model.ts`). */
export interface QueryToolView {
	id: string;
	name: string;
	agentToolName: string;
	description: string;
	sqlTemplate: string;
	parameters: QueryToolParameter[];
	databaseId: string | null;
	enabled: boolean;
	createdBy: string | null;
	canEdit: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface QueryToolPreviewResult {
	columns: string[];
	rows: Record<string, unknown>[];
	rowCount: number;
	truncated: boolean;
	sql: string;
}

export interface QueryToolColumnInfo {
	name: string;
	type: string;
}
