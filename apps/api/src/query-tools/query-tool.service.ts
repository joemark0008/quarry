import { Injectable } from '@nestjs/common';
import {
	compileQueryToolSql,
	type QueryToolParameter,
	QueryToolTemplateError,
	toQueryToolAgentName,
	validateQueryToolParameters,
} from '@quarry/shared/query-tools';
import type { UserRole } from '@quarry/shared/types';

import { fullProjectContextAccess } from '../agent/services/user-group-context-access.service.js';
import { containsBlockedPassthroughCall } from '../agent/utils/sql-filter.js';
import { HandlerError } from '../common/errors/handler-error.js';
import type { Project, ProjectQueryTool as ProjectQueryToolRow } from '../generated/prisma/client.js';
import { columnCatalogPath, loadColumnCatalog } from '../sql-engine/column-catalog.js';
import { WarehouseCredentialsService } from '../warehouse/warehouse-credentials.service.js';
import {
	WarehouseSqlError,
	type WarehouseSqlOptions,
	WarehouseSqlService,
} from '../warehouse/warehouse-sql.service.js';
import { QueryToolRepository } from './query-tool.repository.js';
import type {
	QueryToolColumnInfo as QueryToolColumn,
	QueryToolPreviewResult as QueryToolPreview,
	QueryToolView as ProjectQueryTool,
	SavedQueryToolDefinition,
} from './query-tool.types.js';

export type { SavedQueryToolDefinition };
import { prepareQueryToolSql } from './query-tool-sql.js';

export interface QueryToolDraft {
	name: string;
	description: string;
	sqlTemplate: string;
	parameters: QueryToolParameter[];
	databaseId?: string | null;
	enabled?: boolean;
}

export const PREVIEW_MAX_ROWS = 200;
const PREVIEW_TIMEOUT_MS = 30_000;

/**
 * Saved query tools. Every project member may read them and the agent sees the enabled ones; project admins and
 * the tool's creator may change them. A tool's SQL is checked by the warehouse guards (read-only, allow-list,
 * excluded columns) when it is saved, and again on every run.
 */
@Injectable()
export class QueryToolService {
	constructor(
		private readonly tools: QueryToolRepository,
		private readonly warehouseSql: WarehouseSqlService,
		private readonly warehouseCredentials: WarehouseCredentialsService,
	) {}

	async list(projectId: string, viewer: Viewer): Promise<ProjectQueryTool[]> {
		const rows = await this.tools.listByProject(projectId);
		return rows.map((row) => toModel(row, viewer));
	}

	async get(projectId: string, id: string, viewer: Viewer): Promise<ProjectQueryTool> {
		return toModel(await this.findOrThrow(projectId, id), viewer);
	}

	async create(project: Project, viewer: Viewer, draft: QueryToolDraft): Promise<ProjectQueryTool> {
		const values = await this.validateDraft(project, draft);
		await this.assertNameFree(project.id, values.name);
		const row = await this.tools.create(project.id, viewer.userId, values);
		return toModel(row, viewer);
	}

	async update(
		project: Project,
		viewer: Viewer,
		id: string,
		changes: Partial<QueryToolDraft>,
	): Promise<ProjectQueryTool> {
		const existing = await this.findOrThrow(project.id, id);
		assertCanEdit(existing, viewer);
		const values = await this.validateDraft(project, {
			name: changes.name ?? existing.name,
			description: changes.description ?? existing.description,
			sqlTemplate: changes.sqlTemplate ?? existing.sqlTemplate,
			parameters: changes.parameters ?? readParameters(existing),
			databaseId: changes.databaseId === undefined ? existing.databaseId : changes.databaseId,
			enabled: changes.enabled ?? existing.enabled,
		});
		if (values.name !== existing.name) {
			await this.assertNameFree(project.id, values.name);
		}
		return toModel(await this.tools.update(existing.id, values), viewer);
	}

	async delete(projectId: string, viewer: Viewer, id: string): Promise<boolean> {
		const existing = await this.findOrThrow(projectId, id);
		assertCanEdit(existing, viewer);
		return this.tools.delete(projectId, id);
	}

	/** Runs a draft (or a saved tool's SQL) with argument values, through the same guards as the agent. */
	async preview(
		project: Project,
		input: {
			sqlTemplate: string;
			parameters: QueryToolParameter[];
			values?: Record<string, unknown>;
			databaseId?: string | null;
		},
	): Promise<QueryToolPreview> {
		const parameters = normalizeParameters(input.parameters);
		assertValidParameters(parameters);
		const prepared = await asBadRequest(() =>
			prepareQueryToolSql(input.sqlTemplate, parameters, input.values ?? {}),
		);
		assertNoPassthrough(prepared.sql);
		const options = await this.warehouseOptions(project, input.databaseId);
		const result = await asBadRequest(() =>
			this.warehouseSql.executeWarehouseSql(prepared.sql, {
				...options,
				params: prepared.params,
				limits: { maxRows: PREVIEW_MAX_ROWS, timeoutMs: PREVIEW_TIMEOUT_MS },
			}),
		);
		return {
			columns: result.columns,
			rows: result.data,
			rowCount: result.data.length,
			truncated: result.row_count > result.data.length,
			sql: prepared.displaySql,
		};
	}

	/** Columns of a synced table (the `columns.json` catalog the context sync writes), for the query builder. */
	async listTableColumns(
		project: Project,
		table: { type: string; database: string; schema: string; table: string },
	): Promise<QueryToolColumn[]> {
		if (!project.path) {
			return [];
		}
		const catalog = await loadColumnCatalog(
			columnCatalogPath(project.path, table.type, `database=${table.database}`),
		);
		return catalog[table.schema]?.[table.table] ?? [];
	}

	/** Enabled tools of the project, for the agent's tool set. */
	async listAgentDefinitions(projectId: string): Promise<SavedQueryToolDefinition[]> {
		const rows = await this.tools.listByProject(projectId, { enabledOnly: true });
		return rows.map((row) => ({
			id: row.id,
			name: row.name,
			description: row.description,
			sqlTemplate: row.sqlTemplate,
			parameters: readParameters(row),
			databaseId: row.databaseId,
		}));
	}

	private async findOrThrow(projectId: string, id: string): Promise<ProjectQueryToolRow> {
		const row = await this.tools.findById(projectId, id);
		if (!row) {
			throw new HandlerError('NOT_FOUND', 'Query tool not found.');
		}
		return row;
	}

	private async assertNameFree(projectId: string, name: string): Promise<void> {
		if (await this.tools.findByName(projectId, name)) {
			throw new HandlerError('CONFLICT', `A query tool named "${name}" already exists in this project.`);
		}
	}

	private async validateDraft(project: Project, draft: QueryToolDraft) {
		const parameters = normalizeParameters(draft.parameters);
		assertValidParameters(parameters);
		const compiled = asBadRequestSync(() => compileQueryToolSql(draft.sqlTemplate, parameters));
		assertNoPassthrough(compiled.sql);
		const options = await this.warehouseOptions(project, draft.databaseId);
		await asBadRequest(() => this.warehouseSql.validateWarehouseSql(compiled.sql, options));
		return {
			name: draft.name,
			description: draft.description,
			sqlTemplate: draft.sqlTemplate,
			parameters: parameters as unknown as object[],
			databaseId: draft.databaseId || null,
			enabled: draft.enabled ?? true,
		};
	}

	private async warehouseOptions(project: Project, databaseId?: string | null): Promise<WarehouseSqlOptions> {
		if (!project.path) {
			throw new HandlerError('BAD_REQUEST', 'Project path does not exist.');
		}
		const access = fullProjectContextAccess();
		return {
			projectFolder: project.path,
			databaseId: databaseId || undefined,
			envVars: await this.warehouseCredentials.getProjectRuntimeEnvVars(project.id),
			enforceExcludedColumns: true,
			tableAccess: access.warehouseTableAccess,
			rowSecurity: access.warehouseRowSecurity,
		};
	}
}

export interface Viewer {
	userId: string;
	role: UserRole | null | undefined;
}

export function canEditQueryTool(tool: Pick<ProjectQueryToolRow, 'createdBy'>, viewer: Viewer): boolean {
	return viewer.role === 'admin' || (tool.createdBy !== null && tool.createdBy === viewer.userId);
}

function assertCanEdit(tool: ProjectQueryToolRow, viewer: Viewer): void {
	if (!canEditQueryTool(tool, viewer)) {
		throw new HandlerError('FORBIDDEN', 'Only project admins and the creator of a query tool can change it.');
	}
}

function toModel(row: ProjectQueryToolRow, viewer: Viewer): ProjectQueryTool {
	return {
		id: row.id,
		name: row.name,
		agentToolName: toQueryToolAgentName(row.name),
		description: row.description,
		sqlTemplate: row.sqlTemplate,
		parameters: readParameters(row),
		databaseId: row.databaseId,
		enabled: row.enabled,
		createdBy: row.createdBy,
		canEdit: canEditQueryTool(row, viewer),
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function readParameters(row: Pick<ProjectQueryToolRow, 'parameters'>): QueryToolParameter[] {
	return Array.isArray(row.parameters) ? (row.parameters as unknown as QueryToolParameter[]) : [];
}

function normalizeParameters(parameters: readonly QueryToolParameter[]): QueryToolParameter[] {
	return parameters.map((parameter) => ({
		name: parameter.name,
		type: parameter.type,
		description: parameter.description?.trim() || null,
		required: parameter.required,
		...(parameter.default !== undefined && parameter.default !== null && { default: parameter.default }),
	}));
}

function assertValidParameters(parameters: QueryToolParameter[]): void {
	const problems = validateQueryToolParameters(parameters);
	if (problems.length > 0) {
		throw new HandlerError('BAD_REQUEST', problems.join(' '));
	}
}

function assertNoPassthrough(sql: string): void {
	if (containsBlockedPassthroughCall(sql)) {
		throw new HandlerError('BAD_REQUEST', 'Query tools cannot call catalog or server-passthrough functions.');
	}
}

async function asBadRequest<T>(operation: () => Promise<T>): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		throw toBadRequest(error);
	}
}

function asBadRequestSync<T>(operation: () => T): T {
	try {
		return operation();
	} catch (error) {
		throw toBadRequest(error);
	}
}

function toBadRequest(error: unknown): unknown {
	if (error instanceof QueryToolTemplateError || (error instanceof WarehouseSqlError && error.status < 500)) {
		return new HandlerError('BAD_REQUEST', error.message);
	}
	return error;
}
