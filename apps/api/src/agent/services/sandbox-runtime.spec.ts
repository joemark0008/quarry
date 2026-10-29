import { constants } from 'fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AgentSettings } from '../types/agent-settings.js';

/**
 * Port of upstream `tests/sandbox-runtime.test.ts`. quarry has no `load_skill` tool yet (Phase 3, `skills.ts`
 * lists no internal skill), so upstream's `pdf-handling` skill assertions are left out.
 */
const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')!;

type KvmAccess = 'missing' | 'denied' | 'usable';

const sandboxEnabledSettings = {
	experimental: { sandboxes: true },
} as AgentSettings;

async function loadSandboxModules(kvmAccess: KvmAccess, platform = 'linux') {
	vi.resetModules();
	Object.defineProperty(process, 'platform', { ...originalPlatform, value: platform });

	const accessSync = vi.fn(() => {
		if (kvmAccess !== 'usable') {
			const error = new Error(kvmAccess === 'missing' ? 'ENOENT' : 'EACCES') as NodeJS.ErrnoException;
			error.code = kvmAccess === 'missing' ? 'ENOENT' : 'EACCES';
			throw error;
		}
	});

	vi.doMock('fs', async (importOriginal) => {
		const actual = await importOriginal<typeof import('fs') & { default: typeof import('fs') }>();
		return {
			...actual,
			accessSync,
			default: { ...actual.default, accessSync },
		};
	});
	vi.doMock('@boxlite-ai/boxlite', () => ({
		CodeBox: class FakeCodeBox {},
		ExecError: class FakeExecError extends Error {},
		TimeoutError: class FakeTimeoutError extends Error {},
	}));

	const runtime = await import('./sandbox-runtime.js');
	const sandboxTool = await import('../tools/execute-sandboxed-code.js');
	const { getTools } = await import('../tools/index.js');

	return { accessSync, getTools, runtime, sandboxTool: sandboxTool.default };
}

afterEach(() => {
	Object.defineProperty(process, 'platform', originalPlatform);
	vi.restoreAllMocks();
	vi.resetModules();
	vi.doUnmock('fs');
	vi.doUnmock('@boxlite-ai/boxlite');
});

describe('sandbox runtime host capability', () => {
	it.each(['missing', 'denied'] as const)(
		'should not expose the sandbox when /dev/kvm is %s - regression for ENG-9189',
		async (kvmAccess) => {
			// Arrange
			const modules = await loadSandboxModules(kvmAccess);

			// Act
			const tools = modules.getTools(sandboxEnabledSettings);

			// Assert
			expect(modules.accessSync).toHaveBeenCalledWith('/dev/kvm', constants.R_OK | constants.W_OK);
			expect(modules.runtime.sandboxRuntime).toBeNull();
			expect(modules.runtime.isSandboxAvailable).toBe(false);
			expect(modules.sandboxTool).toBeNull();
			expect(tools).not.toHaveProperty('execute_sandboxed_code');
		},
		15_000,
	);

	it('should expose the sandbox when /dev/kvm is usable', async () => {
		// Arrange
		const modules = await loadSandboxModules('usable');

		// Act
		const tools = modules.getTools(sandboxEnabledSettings);

		// Assert
		expect(modules.accessSync).toHaveBeenCalledWith('/dev/kvm', constants.R_OK | constants.W_OK);
		expect(modules.runtime.sandboxRuntime).not.toBeNull();
		expect(modules.runtime.isSandboxAvailable).toBe(true);
		expect(modules.sandboxTool).not.toBeNull();
		expect(tools).toHaveProperty('execute_sandboxed_code');
	});

	it('should preserve the native runtime check on non-Linux hosts', async () => {
		// Arrange
		const modules = await loadSandboxModules('missing', 'darwin');

		// Act
		const tools = modules.getTools(sandboxEnabledSettings);

		// Assert
		expect(modules.accessSync).not.toHaveBeenCalled();
		expect(modules.runtime.isSandboxAvailable).toBe(true);
		expect(tools).toHaveProperty('execute_sandboxed_code');
	});

	it('should keep the tool out of the tool set unless the experimental setting enables it', async () => {
		// Arrange
		const modules = await loadSandboxModules('usable');

		// Act
		const withoutSetting = modules.getTools({} as AgentSettings);
		const withoutSettings = modules.getTools(null);

		// Assert
		expect(withoutSetting).not.toHaveProperty('execute_sandboxed_code');
		expect(withoutSettings).not.toHaveProperty('execute_sandboxed_code');
	});
});
