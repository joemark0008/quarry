import { describe, expect, it } from 'vitest';

import { EnvValidationError, parseEnv } from './env.js';

/** Port of upstream `tests/env.test.ts`, minus the cloud and billing cases (quarry is self-hosted only). */
const BASE_ENV = { DATABASE_URL: 'postgresql://localhost/quarry' };

function loadEnvWithOverrides(overrides: NodeJS.ProcessEnv) {
	try {
		return { status: 0, env: parseEnv({ ...BASE_ENV, ...overrides }), issues: [] as string[] };
	} catch (error) {
		if (error instanceof EnvValidationError) {
			return { status: 1, env: undefined, issues: error.issues };
		}
		throw error;
	}
}

describe('QUARRY_CONTEXT_SOURCE', () => {
	it.each(['local', 'git', 'api'])('accepts %s', (contextSource) => {
		expect(
			loadEnvWithOverrides({ QUARRY_CONTEXT_SOURCE: contextSource, QUARRY_DEFAULT_PROJECT_PATH: '' }).status,
		).toBe(0);
	});

	it('rejects unknown sources', () => {
		expect(loadEnvWithOverrides({ QUARRY_CONTEXT_SOURCE: 'ftp' }).status).toBe(1);
	});
});

describe('SMTP environment', () => {
	it('allows running without SMTP configuration', () => {
		expect(loadEnvWithOverrides({ SMTP_HOST: '', SMTP_MAIL_FROM: '' }).status).toBe(0);
	});
});

describe('required and cross-field variables', () => {
	it('requires DATABASE_URL', () => {
		const result = loadEnvWithOverrides({ DATABASE_URL: undefined });

		expect(result.status).toBe(1);
		expect(result.issues.join('\n')).toContain('DATABASE_URL');
	});

	it('requires a bucket for the S3 storage backend', () => {
		expect(loadEnvWithOverrides({ QUARRY_STORAGE_BACKEND: 's3' }).status).toBe(1);
		expect(loadEnvWithOverrides({ QUARRY_STORAGE_BACKEND: 's3', QUARRY_STORAGE_S3_BUCKET: 'bucket' }).status).toBe(
			0,
		);
	});

	it('parses booleans and defaults', () => {
		const env = loadEnvWithOverrides({ ENABLE_USER_SIGNUP: 'true' }).env;

		expect(env?.ENABLE_USER_SIGNUP).toBe(true);
		expect(env?.ENABLE_USER_LOGIN).toBe(true);
		expect(env?.PORT).toBe(5006);
		expect(env?.DISABLED_PROVIDERS).toEqual([]);
	});
});
