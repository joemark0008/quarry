import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Injectable, Logger } from '@nestjs/common';

import { HandlerError } from '../common/errors/handler-error.js';
import type { Project } from '../generated/prisma/client.js';
import { JobsService } from '../jobs/jobs.service.js';
import { ProjectRepository } from '../projects/project.repository.js';
import type { SemanticLayerConfig } from '../semantic-layer/metricflow/index.js';
import { type SemanticLayerSyncResult, syncSemanticLayerProvider } from '../semantic-layer/semantic-layer-sync.js';
import { getDatabaseFolderNames } from '../sql-engine/database-config.js';
import { loadProjectConfig, type ProjectConfig } from '../sql-engine/project-config.js';
import { SqlEngineService } from '../sql-engine/sql-engine.service.js';
import { requireProjectPath } from '../warehouse/warehouse-connection.service.js';
import { WarehouseCredentialsService } from '../warehouse/warehouse-credentials.service.js';
import { cleanupStaleDatabases, type DatabaseSyncState, syncDatabase } from './database-sync.js';

export const CONTEXT_SYNC_JOB = 'context.sync';

export type ContextSyncState = 'idle' | 'queued' | 'running' | 'succeeded' | 'failed';

export interface ContextSyncStatus {
	state: ContextSyncState;
	requestedAt: string | null;
	startedAt: string | null;
	finishedAt: string | null;
	message: string | null;
	databases: DatabaseSyncState[];
	log: string[];
}

export interface ContextSyncJobData {
	projectId: string;
	/** `--select`: only these schemas / tables, without deleting the rest. */
	select?: string[];
}

const LOG_LINES = 200;
const IDLE_STATUS: ContextSyncStatus = {
	state: 'idle',
	requestedAt: null,
	startedAt: null,
	finishedAt: null,
	message: null,
	databases: [],
	log: [],
};

/**
 * The in-app "Sync" action, replacing `context sync` (PLAN.md §7): the mutation queues a `context.sync` pg-boss job,
 * the job writes the database context files. The status lives next to the context, in `.meta/sync-status.json`,
 * so it needs no table (the split-mode database keeps upstream's schema).
 */
@Injectable()
export class ContextSyncService {
	private readonly logger = new Logger(ContextSyncService.name);

	constructor(
		private readonly jobs: JobsService,
		private readonly projects: ProjectRepository,
		private readonly sqlEngine: SqlEngineService,
		private readonly credentials: WarehouseCredentialsService,
	) {}

	async requestSync(project: Project, select?: string[] | null): Promise<ContextSyncStatus> {
		const projectPath = requireProjectPath(project);
		const current = await readStatus(projectPath);
		if (current.state === 'queued' || current.state === 'running') {
			return current;
		}
		const status: ContextSyncStatus = {
			...IDLE_STATUS,
			state: 'queued',
			requestedAt: new Date().toISOString(),
			databases: current.databases,
		};
		await writeStatus(projectPath, status);
		const data: ContextSyncJobData = { projectId: project.id, ...(select?.length ? { select } : {}) };
		await this.jobs.send(CONTEXT_SYNC_JOB, data, { singletonKey: project.id, retryLimit: 0 });
		return status;
	}

	async getStatus(project: Project): Promise<ContextSyncStatus> {
		return readStatus(requireProjectPath(project));
	}

	/** Runs the sync (the job handler, also callable directly). */
	async runSync(projectId: string, select: string[] = []): Promise<ContextSyncStatus> {
		const project = await this.projects.getProjectById(projectId);
		if (!project) {
			throw new HandlerError('NOT_FOUND', `Project ${projectId} not found`);
		}
		const projectPath = requireProjectPath(project);
		const previous = await readStatus(projectPath);
		const status: ContextSyncStatus = {
			...previous,
			state: 'running',
			startedAt: new Date().toISOString(),
			finishedAt: null,
			message: null,
			log: [],
		};
		await writeStatus(projectPath, status);
		const log = (line: string) => {
			status.log = [...status.log, line].slice(-LOG_LINES);
		};

		try {
			const envVars = await this.credentials.getProjectRuntimeEnvVars(project.id);
			const config = await loadProjectConfig(projectPath, envVars);
			const databases = (config?.databases ?? []).flatMap((db) => {
				if (!db.supported) {
					log(`Skipping ${db.name}: ${db.type} is not supported yet (PostgreSQL only)`);
					return [];
				}
				return [db.config];
			});
			if (databases.length === 0) {
				throw new Error('No warehouse is connected: connect a PostgreSQL database first.');
			}
			if (select.length === 0) {
				await cleanupStaleDatabases(projectPath, databases);
			}

			const folders = getDatabaseFolderNames(databases);
			const results: DatabaseSyncState[] = [];
			const failures: string[] = [];
			for (const [index, database] of databases.entries()) {
				try {
					const driver = this.sqlEngine.getDriver(database);
					results.push(await syncDatabase(driver, database, projectPath, folders[index], { select, log }));
				} catch (error) {
					const message = `${database.name}: ${error instanceof Error ? error.message : String(error)}`;
					failures.push(message);
					log(`Failed to sync ${message}`);
				}
			}

			const semanticLayer = select.length === 0 ? this.syncSemanticLayer(config, projectPath, log) : null;
			if (semanticLayer && !semanticLayer.success) {
				failures.push(`semantic layer: ${semanticLayer.error}`);
			}

			const tables = results.reduce((total, result) => total + result.tablesSynced, 0);
			Object.assign(status, {
				state: failures.length > 0 && results.length === 0 ? 'failed' : 'succeeded',
				finishedAt: new Date().toISOString(),
				databases: results,
				message:
					failures.length > 0
						? `Synced ${tables} tables with errors: ${failures.join('; ')}`
						: `Synced ${tables} tables from ${results.length} database${results.length === 1 ? '' : 's'}`,
			});
		} catch (error) {
			this.logger.warn(`Context sync failed for project ${project.id}: ${String(error)}`);
			Object.assign(status, {
				state: 'failed',
				finishedAt: new Date().toISOString(),
				message: error instanceof Error ? error.message : String(error),
			});
		}
		await writeStatus(projectPath, status);
		return status;
	}

	/** Upstream `context sync`'s semantic layer provider: `semantics/` docs and the `.meta/` manifest copy. */
	private syncSemanticLayer(
		config: ProjectConfig | null,
		projectPath: string,
		log: (line: string) => void,
	): SemanticLayerSyncResult | null {
		const semanticLayer = readSemanticLayerSection(config);
		if (!semanticLayer) {
			return null;
		}
		const result = syncSemanticLayerProvider(semanticLayer, projectPath);
		log(result.success ? `Semantic layer: ${result.summary}` : `Semantic layer not synced: ${result.error}`);
		return result;
	}
}

function readSemanticLayerSection(config: ProjectConfig | null): SemanticLayerConfig | null {
	const section = config?.raw.semantic_layer;
	if (typeof section !== 'object' || section === null || Array.isArray(section)) {
		return null;
	}
	const { manifest_path: manifestPath, database } = section as Record<string, unknown>;
	if (typeof manifestPath !== 'string' || !manifestPath.trim()) {
		return null;
	}
	return {
		type: 'metricflow',
		manifest_path: manifestPath,
		database: typeof database === 'string' ? database : null,
	};
}

function statusPath(projectPath: string): string {
	return path.join(projectPath, '.meta', 'sync-status.json');
}

async function readStatus(projectPath: string): Promise<ContextSyncStatus> {
	try {
		return { ...IDLE_STATUS, ...JSON.parse(await readFile(statusPath(projectPath), 'utf8')) };
	} catch {
		return { ...IDLE_STATUS };
	}
}

async function writeStatus(projectPath: string, status: ContextSyncStatus): Promise<void> {
	const file = statusPath(projectPath);
	await mkdir(path.dirname(file), { recursive: true });
	await writeFile(`${file}.tmp`, JSON.stringify(status, null, 2));
	await rename(`${file}.tmp`, file);
}
