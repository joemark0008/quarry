import type { executeSandboxedCode } from '@quarry/shared/tools';
import type { Tool } from 'ai';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ToolContext } from '../types/tools.js';

const mocks = vi.hoisted(() => {
	class ExecError extends Error {}
	class TimeoutError extends Error {}

	return {
		boxes: [] as {
			exec: ReturnType<typeof vi.fn>;
			run: ReturnType<typeof vi.fn>;
		}[],
		copyIn: vi.fn(async (..._args: unknown[]) => {}),
		copyOut: vi.fn(async (..._args: unknown[]) => {}),
		exec: vi.fn(async (..._args: unknown[]) => ({ stdout: '', stderr: '', exitCode: 0 })),
		ExecError,
		getImagesByChatId: vi.fn(async () => []),
		installPackages: vi.fn(async (..._args: unknown[]) => {}),
		run: vi.fn(async (_box: unknown, code: string) => code),
		TimeoutError,
	};
});

vi.mock('../services/sandbox-runtime.js', () => ({
	isSandboxAvailable: true,
	sandboxRuntime: {
		CodeBox: class FakeCodeBox {
			/** User code is run through `exec` with an args array; housekeeping passes variadic strings. */
			exec = vi.fn(async (command: string, ...args: unknown[]) => {
				const [codeArgs] = args;
				if (!Array.isArray(codeArgs)) {
					return mocks.exec(this, command, ...(args as string[]));
				}
				const stdout = await mocks.run(this, codeArgs[1]);
				return { stdout, stderr: '', exitCode: 0 };
			});
			installPackages = vi.fn((...packages: string[]) => mocks.installPackages(this, ...packages));
			copyIn = vi.fn((source: string, destination: string) => mocks.copyIn(this, source, destination));
			copyOut = vi.fn((source: string, destination: string) => mocks.copyOut(this, source, destination));

			constructor() {
				mocks.boxes.push(this as never);
			}
		},
		ExecError: mocks.ExecError,
		TimeoutError: mocks.TimeoutError,
	},
}));
vi.mock('../services/project-context-path-access.service.js', () => ({
	isProjectContextPathAllowed: vi.fn(() => true),
}));
vi.mock('../services/query-result.service.js', () => ({
	getQueryResult: vi.fn(),
}));
vi.mock('../services/storage/user-files.js', () => ({
	readUserFileBytes: vi.fn(),
	writeUserFileBytes: vi.fn(),
}));

import sandboxTool from './execute-sandboxed-code.js';

let projectFolder: string;

beforeEach(() => {
	vi.useFakeTimers();
	vi.clearAllMocks();
	mocks.boxes.splice(0);
	mocks.exec.mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });
	mocks.run.mockImplementation(async (_box, code) => code);
	projectFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'quarry-sandbox-project-'));
});

afterEach(() => {
	vi.useRealTimers();
	fs.rmSync(projectFolder, { recursive: true, force: true });
});

describe('execute sandboxed code pooling', () => {
	it('serializes the full operation for requests reusing one sandbox', async () => {
		const initial = await runSandbox({ code: 'seed' });
		const box = mocks.boxes[0];
		const firstStarted = deferred<void>();
		const releaseFirst = deferred<void>();

		box.exec.mockClear();
		mocks.exec.mockClear();
		mocks.run.mockClear();
		mocks.run.mockImplementation(async (_box, code) => {
			if (code === 'first') {
				firstStarted.resolve();
				await releaseFirst.promise;
			}
			return code;
		});

		const first = runSandbox({ sandbox_id: initial.sandbox_id, code: 'first' });
		await firstStarted.promise;
		const second = runSandbox({ sandbox_id: initial.sandbox_id, code: 'second' });
		await Promise.resolve();

		expect(mocks.exec).toHaveBeenCalledTimes(1);
		expect(mocks.run).toHaveBeenCalledTimes(1);

		releaseFirst.resolve();
		await expect(Promise.all([first, second])).resolves.toMatchObject([
			{ stdout: 'first', sandbox_id: initial.sandbox_id },
			{ stdout: 'second', sandbox_id: initial.sandbox_id },
		]);
		expect(mocks.run.mock.calls.map(([, code]) => code)).toEqual(['first', 'second']);
	});

	it('keeps operations on different sandboxes concurrent', async () => {
		const firstSandbox = await runSandbox({ code: 'seed-one' });
		const secondSandbox = await runSandbox({ code: 'seed-two' });
		const firstStarted = deferred<void>();
		const secondStarted = deferred<void>();
		const release = deferred<void>();

		mocks.run.mockImplementation(async (_box, code) => {
			if (code === 'first') {
				firstStarted.resolve();
				await release.promise;
			}
			if (code === 'second') {
				secondStarted.resolve();
				await release.promise;
			}
			return code;
		});

		const first = runSandbox({ sandbox_id: firstSandbox.sandbox_id, code: 'first' });
		const second = runSandbox({ sandbox_id: secondSandbox.sandbox_id, code: 'second' });
		await Promise.all([firstStarted.promise, secondStarted.promise]);

		release.resolve();
		await expect(Promise.all([first, second])).resolves.toMatchObject([
			{ stdout: 'first', sandbox_id: firstSandbox.sandbox_id },
			{ stdout: 'second', sandbox_id: secondSandbox.sandbox_id },
		]);
	});

	it('replaces a timed-out sandbox before a queued request runs', async () => {
		const initial = await runSandbox({ code: 'seed' });
		const timedOutStarted = deferred<void>();
		const releaseTimeout = deferred<void>();

		mocks.run.mockImplementation(async (_box, code) => {
			if (code === 'timeout') {
				timedOutStarted.resolve();
				await releaseTimeout.promise;
				throw new mocks.TimeoutError();
			}
			return code;
		});

		const timedOut = runSandbox({ sandbox_id: initial.sandbox_id, code: 'timeout' });
		await timedOutStarted.promise;
		const queued = runSandbox({ sandbox_id: initial.sandbox_id, code: 'after-timeout' });
		releaseTimeout.resolve();

		await expect(timedOut).resolves.toMatchObject({ exitCode: 124, sandbox_id: initial.sandbox_id });
		const replacement = await queued;
		expect(replacement.sandbox_id).not.toBe(initial.sandbox_id);
		expect(replacement.stderr).toContain(`Sandbox "${initial.sandbox_id}" expired`);
		expect(replacement.stdout).toBe('after-timeout');
		expect(mocks.boxes).toHaveLength(2);
	});
});

async function runSandbox(
	overrides: Pick<executeSandboxedCode.Input, 'code'> & Partial<executeSandboxedCode.Input>,
): Promise<executeSandboxedCode.Output> {
	const input: executeSandboxedCode.Input = {
		language: 'python',
		image: 'python:3.12-slim',
		vm_size: 'xxs',
		...overrides,
	};
	return (await sandboxTool!.execute!(input, {
		experimental_context: context(),
	} as Parameters<
		NonNullable<Tool<executeSandboxedCode.Input, executeSandboxedCode.Output>['execute']>
	>[1])) as executeSandboxedCode.Output;
}

function context(): ToolContext {
	return {
		// quarry: upstream mocked `image.queries`; the tool reaches the images through `context.services`.
		services: { resolveSandboxSecrets: vi.fn(async () => []), getImagesByChatId: mocks.getImagesByChatId },
		projectFolder,
		chatId: 'chat-id',
		userId: 'user-id',
		projectId: 'project-id',
		supportsCustomCharts: false,
		agentSettings: null,
		envVars: {},
		warehouseTableAccess: { enforced: false },
		docsContextAccess: { enforced: false },
		filesContextAccess: { enforced: false },
		mcpAccess: { mode: 'all' },
		userGroupFeatures: [],
		azureAccessToken: null,
		queryResults: new Map(),
		generatedArtifacts: { charts: [], maps: [], stories: [] },
	} as unknown as ToolContext;
}

function deferred<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, reject, resolve };
}
