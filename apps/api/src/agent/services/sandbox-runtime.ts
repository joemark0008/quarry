/**
 * Stand-in for upstream `services/sandbox-runtime.ts`: the boxlite micro-VM runtime (`@boxlite-ai/boxlite`) comes
 * with the sandbox runtime in Phase 2d. Until then no host can run sandboxed code, so `execute_sandboxed_code`
 * stays out of the tool set exactly like upstream on a host without the runtime.
 */

/** The part of boxlite's `CodeBox` the sandbox tool uses. */
export interface SandboxCodeBox {
	exec(
		command: string,
		...args: (string | string[] | Record<string, string> | undefined)[]
	): Promise<{ stdout: string; stderr: string; exitCode: number }>;
	installPackages(...packages: string[]): Promise<unknown>;
	copyIn(source: string, destination: string): Promise<void>;
	copyOut(source: string, destination: string): Promise<void>;
}

export interface SandboxRuntime {
	CodeBox: new (options: Record<string, unknown>) => SandboxCodeBox;
	ExecError: new (...args: never[]) => Error;
	TimeoutError: new (...args: never[]) => Error;
}

export const sandboxRuntime: SandboxRuntime | null = null as SandboxRuntime | null;

export const isSandboxAvailable = sandboxRuntime !== null;
