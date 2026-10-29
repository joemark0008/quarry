import crypto from 'node:crypto';
import path from 'node:path';

import { isLlmProvider, LLM_PROVIDERS, NAMED_PROVIDER_KIND } from '@quarry/shared/types';
import dotenv from 'dotenv';
import { z } from 'zod/v4';

/**
 * Port of upstream `apps/backend/src/env.ts`, minus billing (Stripe, credits), enterprise SSO
 * (OIDC, Microsoft Entra), the license key and cloud-only settings: quarry is self-hosted only.
 * `DB_URI` is `DATABASE_URL` (Prisma) and `SERVER_PORT` is `PORT`.
 */

const optionalNonEmptyString = z
	.string()
	.optional()
	.transform((value) => value?.trim() || undefined);

const booleanString = (defaultValue: 'true' | 'false') =>
	z
		.enum(['true', 'false'])
		.optional()
		.default(defaultValue)
		.transform((val) => val === 'true');

function blankToUndefined(value: unknown): unknown {
	return typeof value === 'string' && value.trim() === '' ? undefined : value;
}

const baseEnvSchema = z.object({
	MODE: z.enum(['dev', 'prod', 'test']).default('dev'),
	PORT: z.coerce.number().int().positive().default(5006),

	DATABASE_URL: z.string().min(1, { message: 'DATABASE_URL is required' }),
	DB_SSL: z
		.enum(['true', 'false'])
		.optional()
		.transform((val) => val === 'true'),
	DB_QUERY_LOGGING: z
		.enum(['true', 'false'])
		.optional()
		.transform((val) => val === 'true'),

	BETTER_AUTH_URL: z.url({ message: 'BETTER_AUTH_URL must be a valid URL' }).default('http://localhost:5005/'),
	BETTER_AUTH_SECRET: z.string().min(20).default(crypto.randomBytes(32).toString('hex')),
	REDIS_URL: optionalNonEmptyString,

	GOOGLE_CLIENT_ID: z.string().optional(),
	GOOGLE_CLIENT_SECRET: z.string().optional(),
	GOOGLE_AUTH_DOMAINS: z.string().optional(),

	GITHUB_CLIENT_ID: z.string().optional(),
	GITHUB_CLIENT_SECRET: z.string().optional(),
	GITHUB_ALLOWED_USERS: z.string().optional(),
	GITHUB_SSO: booleanString('false'),

	GITLAB_CLIENT_ID: z.string().optional(),
	GITLAB_CLIENT_SECRET: z.string().optional(),
	GITLAB_ALLOWED_USERS: z.string().optional(),
	GITLAB_SSO: booleanString('false'),
	GITLAB_BASE_URL: optionalNonEmptyString.pipe(z.url({ message: 'GITLAB_BASE_URL must be a valid URL' }).optional()),
	GITLAB_REDIRECT_URI: optionalNonEmptyString.pipe(
		z.url({ message: 'GITLAB_REDIRECT_URI must be a valid URL' }).optional(),
	),

	ENABLE_USER_LOGIN: booleanString('true'),
	ENABLE_USER_SIGNUP: booleanString('false'),

	DEFAULT_USER_ROLE: z.enum(['admin', 'user', 'viewer']).default('user'),

	SMTP_PASSWORD: z
		.string()
		.optional()
		.transform((value) => value || undefined),
	SMTP_HOST: optionalNonEmptyString,
	SMTP_PORT: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(65_535).default(587)),
	SMTP_USER: optionalNonEmptyString,
	SMTP_MAIL_FROM: optionalNonEmptyString,
	SMTP_SSL: z.preprocess(
		blankToUndefined,
		z
			.enum(['true', 'false'])
			.default('false')
			.transform((value) => value === 'true'),
	),

	/**
	 * Declarative Slack setup: when SLACK_BOT_TOKEN is set, these seed the default project's Slack
	 * settings on boot, replacing the manual Settings > Slack form.
	 * SLACK_TRANSPORT_MODE defaults to socket when SLACK_APP_TOKEN is present, webhook otherwise.
	 */
	SLACK_BOT_TOKEN: optionalNonEmptyString,
	SLACK_SIGNING_SECRET: optionalNonEmptyString,
	SLACK_APP_TOKEN: optionalNonEmptyString,
	SLACK_TRANSPORT_MODE: z.enum(['webhook', 'socket']).optional(),

	/** On SIGTERM, how long /health reports unhealthy while still serving, so a load balancer can move traffic away. */
	SHUTDOWN_DRAIN_DELAY_MS: z.coerce.number().int().nonnegative().default(0),
	APP_VERSION: z.string().default('dev'),
	APP_COMMIT: z.string().default('unknown'),
	APP_BUILD_DATE: z.string().default(''),
	/** GitHub `owner/name` whose releases the update check compares against. Unset: no update check. */
	QUARRY_RELEASES_REPOSITORY: optionalNonEmptyString,

	QUARRY_DEFAULT_PROJECT_PATH: z.string().optional(),
	QUARRY_PROJECTS_DIR: z.string().default('./projects'),
	QUARRY_CONTEXT_SOURCE: z.enum(['local', 'git', 'api']).optional(),
	QUARRY_CONTEXT_GIT_URL: z.string().optional(),
	QUARRY_CONTEXT_GIT_BRANCH: z.string().optional(),
	QUARRY_CONTEXT_GIT_SUBPATH: z.string().optional(),
	QUARRY_CONTEXT_GIT_TOKEN: z.string().optional(),
	QUARRY_CONTEXT_GIT_SSH_KEY: z.string().optional(),
	QUARRY_CONTEXT_GIT_PLATFORM: z.enum(['github', 'gitlab', 'bitbucket']).optional(),

	QUARRY_STORAGE_BACKEND: z.enum(['none', 'local', 's3']).default('local'),
	QUARRY_STORAGE_LOCAL_PATH: z.string().default('./storage'),
	QUARRY_STORAGE_S3_BUCKET: optionalNonEmptyString,
	QUARRY_STORAGE_S3_REGION: optionalNonEmptyString,
	QUARRY_STORAGE_S3_ENDPOINT: optionalNonEmptyString.pipe(
		z.url({ message: 'QUARRY_STORAGE_S3_ENDPOINT must be a valid URL' }).optional(),
	),
	QUARRY_STORAGE_S3_PREFIX: optionalNonEmptyString,
	QUARRY_STORAGE_S3_ACCESS_KEY_ID: optionalNonEmptyString,
	QUARRY_STORAGE_S3_SECRET_ACCESS_KEY: optionalNonEmptyString,
	QUARRY_STORAGE_S3_FORCE_PATH_STYLE: booleanString('false'),
	QUARRY_STORAGE_MAX_FILE_SIZE_MB: z.coerce
		.number({ message: 'QUARRY_STORAGE_MAX_FILE_SIZE_MB must be a number of megabytes' })
		.positive({ message: 'QUARRY_STORAGE_MAX_FILE_SIZE_MB must be greater than 0' })
		.default(10),

	/**
	 * Default for the MCP endpoint toggle (Settings > MCP Endpoint) while a project has no stored
	 * settings. Once an admin saves the settings, the stored value wins and this is ignored.
	 */
	MCP_ENDPOINT_ENABLED: z
		.enum(['true', 'false'])
		.optional()
		.transform((val) => (val === undefined ? undefined : val === 'true')),
	/** Public base URL external MCP clients connect to, when it differs from BETTER_AUTH_URL. */
	MCP_PUBLIC_URL: optionalNonEmptyString.pipe(z.url({ message: 'MCP_PUBLIC_URL must be a valid URL' }).optional()),
	/** Whether unauthenticated OAuth dynamic client registration is allowed (MCP clients rely on it). */
	ALLOW_UNAUTHENTICATED_DCR: booleanString('true'),
	/** Lifetime (in seconds) of OAuth access tokens issued to MCP clients. Defaults to 24h. */
	MCP_ACCESS_TOKEN_TTL: z.coerce.number().int().positive().default(86400),
	/** Lifetime (in seconds) of OAuth refresh tokens issued to MCP clients. Defaults to 7d. */
	MCP_REFRESH_TOKEN_TTL: z.coerce.number().int().positive().default(604800),

	POSTHOG_KEY: z.string().optional(),
	POSTHOG_HOST: z.url({ message: 'POSTHOG_HOST must be a valid URL' }).optional(),
	POSTHOG_DISABLED: z
		.enum(['true', 'false'])
		.optional()
		.transform((val) => val === 'true'),

	/**
	 * Comma-separated providers to keep out of the deployment entirely, regardless of where their
	 * credentials come from. Accepts provider kinds and named instances (openaiCompatible/name).
	 */
	DISABLED_PROVIDERS: z
		.string()
		.optional()
		.transform((val) =>
			(val ?? '')
				.split(',')
				.map((entry) => entry.trim())
				.filter(Boolean),
		)
		.refine((providers) => providers.every(isLlmProvider), {
			message: `DISABLED_PROVIDERS must be a comma-separated list of provider kinds (${LLM_PROVIDERS.join(', ')}) or named instances (${NAMED_PROVIDER_KIND}/<name>)`,
		}),

	LANGFUSE_PUBLIC_KEY: optionalNonEmptyString,
	LANGFUSE_SECRET_KEY: optionalNonEmptyString,
	LANGFUSE_BASE_URL: optionalNonEmptyString.pipe(
		z.url({ message: 'LANGFUSE_BASE_URL must be a valid URL' }).optional(),
	),

	BETA_AUTOMATIONS_ENABLED: booleanString('true'),
	BETA_CONTEXT_RECOMMENDATIONS_ENABLED: booleanString('true'),
	BETA_STORY_FILTERS_ENABLED: booleanString('true'),
	BETA_CUSTOM_STORIES_ENABLED: booleanString('false'),
	BETA_SUBAGENTS_ENABLED: booleanString('false'),
});

export const envSchema = baseEnvSchema
	.superRefine((data, ctx) => {
		if (!data.SLACK_BOT_TOKEN) {
			if (data.SLACK_SIGNING_SECRET || data.SLACK_APP_TOKEN || data.SLACK_TRANSPORT_MODE) {
				ctx.addIssue({
					code: 'custom',
					path: ['SLACK_BOT_TOKEN'],
					message: 'SLACK_BOT_TOKEN is required when other SLACK_* variables are set',
				});
			}
			return;
		}
		const transport = data.SLACK_TRANSPORT_MODE ?? (data.SLACK_APP_TOKEN ? 'socket' : 'webhook');
		if (transport === 'socket' && !data.SLACK_APP_TOKEN) {
			ctx.addIssue({
				code: 'custom',
				path: ['SLACK_APP_TOKEN'],
				message: 'SLACK_APP_TOKEN (xapp-...) is required when SLACK_TRANSPORT_MODE=socket',
			});
		}
		if (transport === 'webhook' && !data.SLACK_SIGNING_SECRET) {
			ctx.addIssue({
				code: 'custom',
				path: ['SLACK_SIGNING_SECRET'],
				message: 'SLACK_SIGNING_SECRET is required when Slack runs in webhook mode',
			});
		}
	})
	.superRefine((data, ctx) => {
		if (data.QUARRY_STORAGE_BACKEND === 's3' && !data.QUARRY_STORAGE_S3_BUCKET) {
			ctx.addIssue({
				code: 'custom',
				path: ['QUARRY_STORAGE_S3_BUCKET'],
				message: 'QUARRY_STORAGE_S3_BUCKET is required when QUARRY_STORAGE_BACKEND=s3.',
			});
		}
	})
	// Refresh tokens must outlive access tokens, otherwise a client can hold a valid
	// access token it can no longer renew once the refresh token has expired.
	.refine((e) => e.MCP_REFRESH_TOKEN_TTL > e.MCP_ACCESS_TOKEN_TTL, {
		message:
			'MCP_REFRESH_TOKEN_TTL must be greater than MCP_ACCESS_TOKEN_TTL so refresh tokens outlive access tokens',
		path: ['MCP_REFRESH_TOKEN_TTL'],
	});

export type Env = z.output<typeof envSchema>;

/**
 * The permanent-storage variables alone. Upstream's storage reads the module-level `env`; quarry's storage
 * (`attachments/storage`) stays module-level too, so it parses these from `process.env` itself.
 */
export const storageEnvSchema = baseEnvSchema.pick({
	QUARRY_STORAGE_BACKEND: true,
	QUARRY_STORAGE_LOCAL_PATH: true,
	QUARRY_STORAGE_S3_BUCKET: true,
	QUARRY_STORAGE_S3_REGION: true,
	QUARRY_STORAGE_S3_ENDPOINT: true,
	QUARRY_STORAGE_S3_PREFIX: true,
	QUARRY_STORAGE_S3_ACCESS_KEY_ID: true,
	QUARRY_STORAGE_S3_SECRET_ACCESS_KEY: true,
	QUARRY_STORAGE_S3_FORCE_PATH_STYLE: true,
	QUARRY_STORAGE_MAX_FILE_SIZE_MB: true,
});

export type StorageEnv = z.output<typeof storageEnvSchema>;

export class EnvValidationError extends Error {
	constructor(readonly issues: string[]) {
		super(`Invalid environment:\n${issues.join('\n')}`);
		this.name = 'EnvValidationError';
	}
}

/** Parses and validates the environment. Throws `EnvValidationError` listing every invalid variable. */
export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
	const result = envSchema.safeParse(source);
	if (!result.success) {
		throw new EnvValidationError(result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
	}
	return result.data;
}

/** Loads the `.env` file at the root of the repository (shared by every app) into `process.env`. */
export function loadDotenv(): void {
	dotenv.config({ path: path.join(import.meta.dirname, '..', '..', '..', '..', '.env'), quiet: true });
}

/** The story beta flags; upstream's module-level story services read them through `stories/env.ts`. */
export const storyEnvSchema = baseEnvSchema.pick({
	BETA_CUSTOM_STORIES_ENABLED: true,
	BETA_STORY_FILTERS_ENABLED: true,
});
