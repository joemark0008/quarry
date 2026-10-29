import { type DatabaseConfig, postgresDatabaseConfigSchema } from './database-config.js';

/**
 * Port of upstream `fastapi/warehouse_provisioning.py` for Postgres: validate the credentials a user enters in
 * the app, and turn them into a `nao_config.yaml` database entry whose values are `{{ env('…') }}` references.
 * The env values are stored encrypted with the project (`project_warehouse_credentials`), never in the file.
 */

export const SUPPORTED_WAREHOUSE_PROVIDERS = ['postgres'] as const;
export type WarehouseProvider = (typeof SUPPORTED_WAREHOUSE_PROVIDERS)[number];

const ALLOWED_FIELDS: Record<WarehouseProvider, string[]> = {
	postgres: ['host', 'port', 'user', 'database', 'password', 'schema_name', 'ssl'],
};

const AUTH_FIELDS: Record<WarehouseProvider, string[]> = { postgres: ['user', 'password'] };
const ENDPOINT_FIELDS: Record<WarehouseProvider, string[]> = { postgres: ['host', 'port'] };

export const WAREHOUSE_ENV_PREFIX = 'QUARRY_WAREHOUSE_';

export class WarehouseCredentialsError extends Error {
	override name = 'WarehouseCredentialsError';

	constructor(
		readonly code: 'invalid_warehouse_credentials' | 'warehouse_connection_failed',
		readonly fields: string[],
		message?: string,
	) {
		super(message ?? code);
	}
}

export function isWarehouseProvider(value: string): value is WarehouseProvider {
	return (SUPPORTED_WAREHOUSE_PROVIDERS as readonly string[]).includes(value);
}

/** `sanitize_warehouse_credentials` + `parse_database_config`. */
export function parseWarehouseCredentials(provider: string, credentials: Record<string, unknown>): DatabaseConfig {
	if (!isWarehouseProvider(provider)) {
		throw new WarehouseCredentialsError('invalid_warehouse_credentials', ['provider'], 'Unsupported provider');
	}
	const extra = Object.keys(credentials).filter((field) => !ALLOWED_FIELDS[provider].includes(field));
	if (extra.length > 0) {
		throw new WarehouseCredentialsError('invalid_warehouse_credentials', extra.sort());
	}
	const parsed = postgresDatabaseConfigSchema.safeParse({
		...withoutEmptyValues(credentials),
		type: provider,
		name: provider,
	});
	if (!parsed.success) {
		const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))].sort();
		throw new WarehouseCredentialsError('invalid_warehouse_credentials', fields);
	}
	return parsed.data;
}

/** `prepare_warehouse_config`: the YAML entry (with env references) and the env values to store. */
export function prepareWarehouseConfig(
	provider: string,
	credentials: Record<string, unknown>,
	name: string = provider,
): { databaseConfig: Record<string, unknown>; envVars: Record<string, string> } {
	parseWarehouseCredentials(provider, credentials);
	const databaseConfig: Record<string, unknown> = { type: provider, name };
	const envVars: Record<string, string> = {};
	for (const field of Object.keys(withoutEmptyValues(credentials)).sort()) {
		const envName = `${WAREHOUSE_ENV_PREFIX}${provider.toUpperCase()}_${field.toUpperCase().replace(/-/g, '_')}`;
		if (envName in envVars) {
			throw new Error(`Conflicting warehouse environment variable: ${envName}`);
		}
		envVars[envName] = JSON.stringify(credentials[field]);
		databaseConfig[field] = `{{ env('${envName}') }}`;
	}
	return { databaseConfig, envVars };
}

/** `infer_warehouse_error_fields`: which form fields a connection error most likely points at. */
export function inferWarehouseErrorFields(provider: WarehouseProvider, error: unknown): string[] {
	const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
	if (message.includes('schema')) {
		return ['schema_name'];
	}
	if (
		message.includes('database') &&
		['does not exist', 'not found', 'unknown'].some((phrase) => message.includes(phrase))
	) {
		return ['database'];
	}
	if (
		[
			'authentication',
			'access denied',
			'invalid credential',
			'login failed',
			'password',
			'unauthorized',
			'forbidden',
			'role',
		].some((phrase) => message.includes(phrase))
	) {
		return AUTH_FIELDS[provider];
	}
	if (
		[
			'connection refused',
			'econnrefused',
			'could not connect',
			'enotfound',
			'getaddrinfo',
			'network',
			'no route to host',
			'timed out',
			'timeout',
		].some((phrase) => message.includes(phrase))
	) {
		return ENDPOINT_FIELDS[provider];
	}
	return [];
}

function withoutEmptyValues(values: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== null && value !== ''));
}
