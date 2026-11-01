import path from 'node:path';

import type { executeSemanticQuery } from '@quarry/shared/tools';
import { DEFAULT_SEMANTIC_LAYER_MODE, type SemanticLayerMode } from '@quarry/shared/types';

import {
	metricflowDialectFor,
	MetricFlowSemanticLayer,
	runtimeManifestPath,
	SemanticLayerError,
	SemanticQueryError,
} from '../../semantic-layer/metricflow/index.js';
import { loadProjectConfig, type ProjectConfig, ProjectConfigError } from '../../sql-engine/project-config.js';
import type { AgentSettings } from '../types/agent-settings.js';
import type { ToolContext } from '../types/tools.js';
import { extractConfiguredSemanticLayer } from '../utils/quarry-config.js';

/** A metric query in semantic terms, mirroring the `/semantic_layer/compile` request body. */
export type SemanticQuery = Omit<executeSemanticQuery.Input, 'name'>;

/** The semantic layer rejected the query (for example an unknown metric or dimension); its message is safe to show to the caller. */
export class SemanticQueryCompileError extends Error {}

export type CompiledSemanticQuery = {
	sql: string;
	database_id: string;
	dialect: string;
};

/**
 * The semantic layer routing mode in effect for a run, or null when the project
 * declares no `semantic_layer` in quarry_config.yaml. The repo decides whether a layer
 * exists; the admin settings decide how the agent uses it.
 */
export function resolveSemanticLayerMode(
	projectFolder: string,
	agentSettings: AgentSettings | null,
): SemanticLayerMode | null {
	if (!extractConfiguredSemanticLayer(projectFolder)) {
		return null;
	}
	return agentSettings?.semanticLayer?.mode ?? DEFAULT_SEMANTIC_LAYER_MODE;
}

/** `execute_semantic_query` is only exposed when the layer exists and the admin lets the agent query it. */
export function isSemanticQueryToolEnabled(mode: SemanticLayerMode | null | undefined): boolean {
	return mode === 'prioritized' || mode === 'exclusive';
}

/**
 * In semantics-only mode the warehouse is only reachable through the layer: `execute_sql` stays
 * available but is restricted to the local database (files and earlier results).
 */
export function isWarehouseSqlEnabled(mode: SemanticLayerMode | null | undefined): boolean {
	return mode !== 'exclusive';
}

/**
 * Compiles metrics and dimensions to SQL with the project's semantic layer; execution stays with execute_sql.
 * quarry: upstream posted to the FastAPI `/semantic_layer/compile` endpoint (MetricFlow in Python); this is that
 * endpoint's logic on the Node port of the compiler (`semantic-layer/metricflow`). Its 422s (query errors) are
 * `SemanticQueryCompileError`s, everything else a plain `Error`, with upstream's messages.
 */
export async function compileSemanticQuery(query: SemanticQuery, context: ToolContext): Promise<CompiledSemanticQuery> {
	try {
		const projectPath = path.resolve(context.projectFolder);
		const config = await loadProjectConfig(projectPath, context.envVars);
		const semanticLayer = config ? readSemanticLayerConfig(config) : null;
		if (!config || !semanticLayer) {
			throw new SemanticLayerError('No semantic_layer configured in quarry_config.yaml');
		}

		const database = resolveSemanticLayerDatabase(config, semanticLayer.database);
		const dialect = metricflowDialectFor(database.type);
		const engine = MetricFlowSemanticLayer.load(runtimeManifestPath(semanticLayer, projectPath), dialect);
		const sql = engine.compile({
			metrics: query.metrics,
			groupBy: query.group_by,
			where: query.where,
			orderBy: query.order_by,
			limit: query.limit,
			startTime: query.start_time,
			endTime: query.end_time,
		});
		return { sql, database_id: database.name, dialect: database.type };
	} catch (error) {
		const message = `Error compiling semantic query: ${error instanceof Error ? error.message : String(error)}`;
		throw error instanceof SemanticQueryError ? new SemanticQueryCompileError(message) : new Error(message);
	}
}

function readSemanticLayerConfig(config: ProjectConfig) {
	const section = config.raw.semantic_layer;
	if (typeof section !== 'object' || section === null || Array.isArray(section)) {
		return null;
	}
	const { manifest_path, database, type } = section as Record<string, unknown>;
	if (typeof manifest_path !== 'string' || !manifest_path.trim()) {
		throw new ProjectConfigError('semantic_layer.manifest_path is required');
	}
	if (type !== undefined && type !== 'metricflow') {
		throw new ProjectConfigError(`Unsupported semantic_layer.type '${String(type)}': only metricflow is supported`);
	}
	return {
		type: 'metricflow' as const,
		manifest_path,
		database: typeof database === 'string' && database.trim() ? database : null,
	};
}

/** Port of `fastapi/main.py` `_resolve_semantic_layer_database`. */
function resolveSemanticLayerDatabase(config: ProjectConfig, databaseName: string | null) {
	if (databaseName !== null) {
		const database = config.databases.find((db) => db.name === databaseName);
		if (!database) {
			throw new SemanticLayerError(`semantic_layer.database '${databaseName}' is not a configured database`);
		}
		return database;
	}
	if (config.databases.length === 1) {
		return config.databases[0];
	}
	throw new SemanticLayerError(
		'semantic_layer.database must name the database that runs semantic queries when several are configured',
	);
}
