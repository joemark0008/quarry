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

describe('NAO_CONTEXT_SOURCE', () => {
	it.each(['local', 'git', 'api'])('accepts %s', (contextSource) => {
		expect(loadEnvWithOverrides({ NAO_CONTEXT_SOURCE: contextSource, NAO_DEFAULT_PROJECT_PATH: '' }).status).toBe(
			0,
		);
	});

	it('rejects unknown sources', () => {
		expect(loadEnvWithOverrides({ NAO_CONTEXT_SOURCE: 'ftp' }).status).toBe(1);
	});
});

describe('SMTP environment', () => {
	it('allows running without SMTP configuration', () => {
		expect(loadEnvWithOverrides({ SMTP_HOST: '', SMTP_MAIL_FROM: '', SMTP_PASSWORD: '' }).status).toBe(0);
	});

	it('treats blank SMTP_PORT and SMTP_SSL as their defaults', () => {
		const result = loadEnvWithOverrides({ SMTP_PORT: '', SMTP_SSL: '' });

		expect(result.status).toBe(0);
		expect(result.env?.SMTP_PORT).toBe(587);
		expect(result.env?.SMTP_SSL).toBe(false);
	});
});

describe('required and cross-field variables', () => {
	it('requires DATABASE_URL', () => {
		const result = loadEnvWithOverrides({ DATABASE_URL: undefined });

		expect(result.status).toBe(1);
		expect(result.issues.join('\n')).toContain('DATABASE_URL');
	});

	it('requires SLACK_BOT_TOKEN when other Slack variables are set', () => {
		const result = loadEnvWithOverrides({ SLACK_SIGNING_SECRET: 'secret' });

		expect(result.issues).toContain(
			'SLACK_BOT_TOKEN: SLACK_BOT_TOKEN is required when other SLACK_* variables are set',
		);
	});

	it('requires a bucket for the S3 storage backend', () => {
		expect(loadEnvWithOverrides({ NAO_STORAGE_BACKEND: 's3' }).status).toBe(1);
		expect(loadEnvWithOverrides({ NAO_STORAGE_BACKEND: 's3', NAO_STORAGE_S3_BUCKET: 'bucket' }).status).toBe(0);
	});

	it('requires refresh tokens to outlive access tokens', () => {
		expect(loadEnvWithOverrides({ MCP_ACCESS_TOKEN_TTL: '100', MCP_REFRESH_TOKEN_TTL: '50' }).status).toBe(1);
	});

	it('parses booleans and defaults', () => {
		const env = loadEnvWithOverrides({ ENABLE_USER_SIGNUP: 'true' }).env;

		expect(env?.ENABLE_USER_SIGNUP).toBe(true);
		expect(env?.ENABLE_USER_LOGIN).toBe(true);
		expect(env?.PORT).toBe(5005);
		expect(env?.DISABLED_PROVIDERS).toEqual([]);
	});
});
