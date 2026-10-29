import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EnvValidationError, parseEnv } from '../../config/env.js';
import { getEnvProviders, hasEnvApiKey, isProviderDisabled, LlmService } from './llm.service.js';
import type { ProjectLlmConfigRepository } from './project-llm-config.repository.js';

/**
 * Ports of upstream `tests/disabled-providers.test.ts`, `tests/annotation-model.test.ts` and
 * `tests/project-available-models.test.ts` (the parts covering `utils/llm.ts`). Upstream's query modules
 * are replaced by a mocked `ProjectLlmConfigRepository`. Quarry drops the managed `nao` provider (billing)
 * and the `llm` block of `nao_config.yaml`, so the cases about those are not ported.
 */
const mocks = vi.hoisted(() => ({
	getProjectLlmConfigs: vi.fn(),
	getProjectLlmConfigByProvider: vi.fn(),
	getDefaultModelSettings: vi.fn(),
}));

const llm = new LlmService(mocks as unknown as ProjectLlmConfigRepository);

const BASE_ENV = { DATABASE_URL: 'postgresql://localhost/quarry' };

function parseDisabledProviders(value: string): string[] {
	return parseEnv({ ...BASE_ENV, DISABLED_PROVIDERS: value }).DISABLED_PROVIDERS;
}

describe('DISABLED_PROVIDERS', () => {
	let originalEnv: typeof process.env;

	beforeEach(() => {
		originalEnv = { ...process.env };
		vi.clearAllMocks();
		mocks.getProjectLlmConfigByProvider.mockResolvedValue(null);
		mocks.getProjectLlmConfigs.mockResolvedValue([]);
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	function setDisabledProviders(value: string | undefined) {
		if (value === undefined) {
			delete process.env.DISABLED_PROVIDERS;
		} else {
			process.env.DISABLED_PROVIDERS = value;
		}
	}

	it('defaults to an empty list', () => {
		setDisabledProviders(undefined);
		expect(parseEnv(BASE_ENV).DISABLED_PROVIDERS).toEqual([]);
		expect(isProviderDisabled('bedrock')).toBe(false);
	});

	it('parses a comma-separated list, ignoring whitespace and empty entries', () => {
		setDisabledProviders(' bedrock , vertex ,');
		expect(parseDisabledProviders(' bedrock , vertex ,')).toEqual(['bedrock', 'vertex']);
		expect(isProviderDisabled('bedrock')).toBe(true);
		expect(isProviderDisabled('vertex')).toBe(true);
		expect(isProviderDisabled('anthropic')).toBe(false);
	});

	it('rejects unknown provider ids', () => {
		expect(() => parseDisabledProviders('bedrock,not-a-provider')).toThrow(EnvValidationError);
		expect(() => parseDisabledProviders('bedrock,not-a-provider')).toThrow(/DISABLED_PROVIDERS/);
	});

	it('rejects malformed named-instance ids', () => {
		expect(() => parseDisabledProviders('openaiCompatible/Bad_Name')).toThrow(/DISABLED_PROVIDERS/);
		expect(() => parseDisabledProviders('anthropic/some-name')).toThrow(/DISABLED_PROVIDERS/);
	});

	it('disabling a kind covers its named instances, and an instance can be disabled alone', () => {
		setDisabledProviders('openaiCompatible');
		expect(isProviderDisabled('openaiCompatible/my-vllm')).toBe(true);

		setDisabledProviders('openaiCompatible/my-vllm');
		expect(isProviderDisabled('openaiCompatible/my-vllm')).toBe(true);
		expect(isProviderDisabled('openaiCompatible/other')).toBe(false);
		expect(isProviderDisabled('openaiCompatible')).toBe(false);
	});

	it('keeps a disabled provider from auto-registering off ambient credentials', () => {
		process.env.AWS_WEB_IDENTITY_TOKEN_FILE = '/var/run/secrets/token';
		setDisabledProviders(undefined);
		expect(hasEnvApiKey('bedrock')).toBe(true);
		expect(getEnvProviders()).toContain('bedrock');

		setDisabledProviders('bedrock');
		expect(hasEnvApiKey('bedrock')).toBe(false);
		expect(getEnvProviders()).not.toContain('bedrock');
	});

	it('never auto-registers the nao-managed key as an environment provider', () => {
		// Upstream's `isManagedAiEnabled` assertions are dropped: quarry has no managed AI (billing).
		process.env.NAO_MANAGED_OPENAI_API_KEY = 'managed-key';
		setDisabledProviders(undefined);
		expect(hasEnvApiKey('nao')).toBe(false);
		expect(getEnvProviders()).not.toContain('nao');
	});

	it('overrides credentials configured in the database', async () => {
		mocks.getProjectLlmConfigByProvider.mockResolvedValue({
			apiKey: 'db-key',
			baseUrl: null,
			credentials: null,
			modelSettings: {},
		});
		setDisabledProviders(undefined);
		expect(await llm.resolveProviderSettings('project-1', 'bedrock')).not.toBeNull();

		setDisabledProviders('bedrock');
		expect(await llm.resolveProviderSettings('project-1', 'bedrock')).toBeNull();
	});
});

describe('resolveAnnotationModelId', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getProjectLlmConfigByProvider.mockResolvedValue(null);
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('uses the active model for a provider with a custom base URL', async () => {
		mocks.getProjectLlmConfigByProvider.mockResolvedValue({
			baseUrl: 'http://litellm.test/v1',
			enabledModels: ['gpt-4.1-mini', 'gpt-5.5'],
		});

		const modelId = await llm.resolveAnnotationModelId(
			'project-1',
			{ provider: 'openai', modelId: 'gpt-5.5' },
			'gpt-4.1-mini',
		);

		expect(modelId).toBe('gpt-5.5');
	});

	it('keeps the configured annotation model for a provider without a custom base URL', async () => {
		mocks.getProjectLlmConfigByProvider.mockResolvedValue({
			baseUrl: null,
			enabledModels: ['gpt-4.1-mini', 'gpt-5.5'],
		});

		const modelId = await llm.resolveAnnotationModelId(
			'project-1',
			{ provider: 'openai', modelId: 'gpt-5.5' },
			'gpt-4.1-mini',
		);

		expect(modelId).toBe('gpt-4.1-mini');
	});

	it('uses the active model when the provider base URL comes from the environment', async () => {
		vi.stubEnv('OPENAI_BASE_URL', 'http://litellm.test/v1');

		const modelId = await llm.resolveAnnotationModelId(
			'project-1',
			{ provider: 'openai', modelId: 'gpt-5.5' },
			'gpt-4.1-mini',
		);

		expect(modelId).toBe('gpt-5.5');
	});
});

describe('getProjectAvailableModels', () => {
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		originalEnv = { ...process.env };
		vi.clearAllMocks();
		mocks.getProjectLlmConfigs.mockResolvedValue([]);
		mocks.getProjectLlmConfigByProvider.mockResolvedValue(null);
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	// Upstream's managed `nao` cases (credits, BYOK alongside curated models) and the `nao_config.yaml`
	// named openai-compatible endpoints case are skipped: quarry ports neither.

	it('never exposes the managed provider in self-hosted mode', async () => {
		process.env.NAO_MANAGED_OPENAI_API_KEY = 'managed-key';
		process.env.NAO_MODE = 'self-hosted';

		const models = await llm.getProjectAvailableModels('project-1');
		expect(models.some(({ provider }) => provider === 'nao')).toBe(false);
		await expect(
			llm.resolveProviderModel('project-1', 'nao', 'gpt-6-luna', true, {
				userId: 'user-1',
				projectId: 'project-1',
				runId: 'run-1',
				category: 'chat',
				billingMode: 'unbilled',
			}),
		).resolves.toBeNull();
	});
});
