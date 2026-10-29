import { Injectable } from '@nestjs/common';

import { HandlerError } from '../common/errors/handler-error.js';
import type { Project } from '../generated/prisma/client.js';
import type { DatabaseConfig } from '../sql-engine/database-config.js';
import { loadProjectConfig, ProjectConfigError, resolveDatabase } from '../sql-engine/project-config.js';
import { SqlEngineService } from '../sql-engine/sql-engine.service.js';
import { WarehouseCredentialsError } from '../sql-engine/warehouse-provisioning.js';
import { readProjectConfigDocument, writeProjectConfigDocument } from './project-config-file.js';
import { WarehouseCredentialsService } from './warehouse-credentials.service.js';

export interface WarehouseConnectionInput {
	name: string;
	host: string;
	port: number;
	database: string;
	user: string;
	password?: string | null;
	schemaName?: string | null;
	ssl?: boolean | null;
}

export interface WarehouseConnectionInfo {
	name: string;
	type: string;
	supported: boolean;
	host: string | null;
	port: number | null;
	database: string | null;
	user: string | null;
	schemaName: string | null;
	ssl: boolean;
	allowListedOnly: boolean;
	hasPassword: boolean;
}

export interface WarehouseConnectionResult {
	success: boolean;
	message: string;
	fields: string[];
}

/**
 * Connects a project to its warehouse from the app (quarry's replacement for editing `quarry_config.yaml` and
 * upstream's onboarding provisioning): credentials are checked on a live connection, the database entry is
 * written to `quarry_config.yaml` with `{{ env('…') }}` references, and the values are stored encrypted.
 */
@Injectable()
export class WarehouseConnectionService {
	constructor(
		private readonly sqlEngine: SqlEngineService,
		private readonly credentials: WarehouseCredentialsService,
	) {}

	/** The databases configured in the project, without secrets. */
	async listConnections(project: Project): Promise<WarehouseConnectionInfo[]> {
		const projectPath = requireProjectPath(project);
		const envVars = await this.credentials.getProjectRuntimeEnvVars(project.id);
		let config;
		try {
			config = await loadProjectConfig(projectPath, envVars);
		} catch (error) {
			throw new HandlerError('BAD_REQUEST', error instanceof Error ? error.message : String(error));
		}
		return (config?.databases ?? []).map((database) =>
			database.supported ? toInfo(database.config) : unsupportedInfo(database.name, database.type),
		);
	}

	async connect(project: Project, input: WarehouseConnectionInput): Promise<WarehouseConnectionResult> {
		const projectPath = requireProjectPath(project);
		const credentials = await this.mergeStoredPassword(project, input);
		try {
			await this.sqlEngine.validateWarehouse('postgres', credentials);
		} catch (error) {
			if (error instanceof WarehouseCredentialsError) {
				return { success: false, message: describeCredentialsError(error), fields: error.fields };
			}
			throw error;
		}

		const { databaseConfig, envVars } = this.sqlEngine.prepareWarehouse(
			'postgres',
			credentials,
			input.name,
			envName(input.name, ''),
		);
		const { document, templates } = await readProjectConfigDocument(projectPath);
		const databases = (document.databases ?? []).filter((entry) => entry.name !== input.name);
		const previous = (document.databases ?? []).find((entry) => entry.name === input.name);
		document.project_name ??= project.name;
		document.databases = [...databases, { ...keptSettings(previous), ...databaseConfig }];
		await writeProjectConfigDocument(projectPath, document, templates);

		const storedEnvVars = await this.credentials.getProjectWarehouseEnvVars(project.id);
		await this.credentials.saveProjectWarehouseEnvVars(project.id, 'postgres', {
			...withoutConnection(storedEnvVars, input.name),
			...envVars,
		});
		return { success: true, message: 'Connected', fields: [] };
	}

	async testConnection(project: Project, name?: string | null): Promise<WarehouseConnectionResult> {
		const projectPath = requireProjectPath(project);
		const envVars = await this.credentials.getProjectRuntimeEnvVars(project.id);
		try {
			const config = await loadProjectConfig(projectPath, envVars);
			if (!config) {
				return { success: false, message: 'No warehouse is connected yet.', fields: [] };
			}
			const { config: database } = resolveDatabase(config, name);
			const check = await this.sqlEngine.getDriver(database).testConnection();
			return { success: check.success, message: check.message, fields: [] };
		} catch (error) {
			if (error instanceof ProjectConfigError) {
				return { success: false, message: error.message, fields: [] };
			}
			throw error;
		}
	}

	async disconnect(project: Project, name: string): Promise<void> {
		const projectPath = requireProjectPath(project);
		const { document, templates } = await readProjectConfigDocument(projectPath);
		document.databases = (document.databases ?? []).filter((entry) => entry.name !== name);
		await writeProjectConfigDocument(projectPath, document, templates);
		const stored = await this.credentials.getProjectWarehouseEnvVars(project.id);
		const remaining = withoutConnection(stored, name);
		if (Object.keys(remaining).length === 0) {
			await this.credentials.deleteProjectWarehouseEnvVars(project.id);
		} else {
			await this.credentials.saveProjectWarehouseEnvVars(project.id, 'postgres', remaining);
		}
	}

	/** Editing a connection without retyping the password keeps the stored one. */
	private async mergeStoredPassword(
		project: Project,
		input: WarehouseConnectionInput,
	): Promise<Record<string, unknown>> {
		const credentials: Record<string, unknown> = {
			host: input.host,
			port: input.port,
			database: input.database,
			user: input.user,
			password: input.password ?? '',
			schema_name: input.schemaName ?? '',
			...(input.ssl ? { ssl: true } : {}),
		};
		if (!input.password) {
			const stored = await this.credentials.getProjectWarehouseEnvVars(project.id);
			const storedPassword = stored[envName(input.name, 'password')];
			if (storedPassword) {
				credentials.password = JSON.parse(storedPassword);
			}
		}
		return credentials;
	}
}

export function requireProjectPath(project: Project): string {
	if (!project.path) {
		throw new HandlerError('BAD_REQUEST', 'This project has no folder on disk.');
	}
	return project.path;
}

function envName(connectionName: string, field: string): string {
	const connection = connectionName.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
	return `QUARRY_WAREHOUSE_${connection}_${field.toUpperCase()}`;
}

function withoutConnection(envVars: Record<string, string>, name: string): Record<string, string> {
	const prefix = envName(name, '');
	return Object.fromEntries(Object.entries(envVars).filter(([key]) => !key.startsWith(prefix)));
}

/** Settings a user edits in the YAML (allow-list, templates, include/exclude) survive a reconnect. */
function keptSettings(previous: Record<string, unknown> | undefined): Record<string, unknown> {
	if (!previous) {
		return {};
	}
	const connectionFields = new Set(['type', 'name', 'host', 'port', 'database', 'user', 'password', 'schema_name']);
	return Object.fromEntries(Object.entries(previous).filter(([key]) => !connectionFields.has(key)));
}

function toInfo(config: DatabaseConfig): WarehouseConnectionInfo {
	return {
		name: config.name,
		type: config.type,
		supported: true,
		host: config.host,
		port: config.port,
		database: config.database,
		user: config.user,
		schemaName: config.schema_name ?? null,
		ssl: Boolean(config.ssl),
		allowListedOnly: config.allow_listed_only,
		hasPassword: config.password.length > 0,
	};
}

function unsupportedInfo(name: string, type: string): WarehouseConnectionInfo {
	return {
		name,
		type,
		supported: false,
		host: null,
		port: null,
		database: null,
		user: null,
		schemaName: null,
		ssl: false,
		allowListedOnly: false,
		hasPassword: false,
	};
}

function describeCredentialsError(error: WarehouseCredentialsError): string {
	if (error.code === 'invalid_warehouse_credentials') {
		return `Check these fields: ${error.fields.join(', ') || 'unknown'}.`;
	}
	return `Could not connect: ${error.message}`;
}
