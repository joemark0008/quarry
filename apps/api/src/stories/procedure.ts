import type { UserRole } from '@quarry/shared/types';
import { z } from 'zod/v4';

import type { AuthUser } from '../auth/auth.service.js';
import { HandlerError } from '../common/errors/handler-error.js';
import type { Project } from '../generated/prisma/client.js';
import { projectQueries } from './story-queries.js';

/**
 * The subset of tRPC's procedure builder upstream's story routers use (`input`, `use`, `query`, `mutation`), so the
 * routers are ported as they are: each procedure's middlewares and handler run inside a service, called by a thin
 * GraphQL resolver. Authentication and project resolution happen in the resolver (`AuthGuard`, `@ProjectAccess()`),
 * which hands the result over as the base context; the base procedures below only check it, as upstream's did.
 */
export interface ProcedureBaseContext {
	user: AuthUser;
	/** Set by `@ProjectAccess()` on procedures upstream built on `projectProtectedProcedure`. */
	project?: Project;
	userRole?: UserRole | null;
}

type Context = Record<string, unknown>;

interface MiddlewareOptions<Ctx, Input> {
	ctx: Ctx;
	input: Input;
	getRawInput: () => Promise<unknown>;
	next: <Extra extends Context = Context>(opts?: { ctx?: Extra }) => Promise<MiddlewareResult<Extra>>;
}

/** Carries the context additions down the chain; only its type parameter matters to callers. */
export interface MiddlewareResult<Extra = Context> {
	readonly ctx: Extra;
}

type Middleware = (opts: MiddlewareOptions<Context, unknown>) => Promise<MiddlewareResult>;

export interface Procedure<Ctx, Input, Output> {
	readonly kind: 'query' | 'mutation';
	run(ctx: ProcedureBaseContext, rawInput: unknown): Promise<Output>;
	/** Type-only marker so callers can read the handler's context and input types. */
	readonly _types?: { ctx: Ctx; input: Input };
}

export class ProcedureBuilder<Ctx extends Context, Input> {
	constructor(
		private readonly middlewares: Middleware[] = [],
		private readonly schemas: z.ZodType[] = [],
	) {}

	input<Schema extends z.ZodType>(schema: Schema): ProcedureBuilder<Ctx, Input & z.output<Schema>> {
		return new ProcedureBuilder(this.middlewares, [...this.schemas, schema]);
	}

	use<Extra extends Context = Context>(
		middleware: (opts: MiddlewareOptions<Ctx, Input>) => Promise<MiddlewareResult<Extra>>,
	): ProcedureBuilder<Ctx & Extra, Input> {
		return new ProcedureBuilder([...this.middlewares, middleware as unknown as Middleware], this.schemas);
	}

	query<Output>(
		handler: (opts: { ctx: Ctx; input: Input }) => Promise<Output> | Output,
	): Procedure<Ctx, Input, Output> {
		return this.build('query', handler);
	}

	mutation<Output>(
		handler: (opts: { ctx: Ctx; input: Input }) => Promise<Output> | Output,
	): Procedure<Ctx, Input, Output> {
		return this.build('mutation', handler);
	}

	private build<Output>(
		kind: 'query' | 'mutation',
		handler: (opts: { ctx: Ctx; input: Input }) => Promise<Output> | Output,
	): Procedure<Ctx, Input, Output> {
		const { middlewares, schemas } = this;
		return {
			kind,
			async run(baseContext, rawInput) {
				const input = parseInput(schemas, rawInput) as Input;
				const getRawInput = async () => rawInput ?? {};
				const runFrom = async (index: number, ctx: Context): Promise<Output> => {
					const middleware = middlewares[index];
					if (!middleware) {
						return handler({ ctx: ctx as Ctx, input });
					}
					let output: Output | undefined;
					await middleware({
						ctx,
						input,
						getRawInput,
						next: async (opts) => {
							output = await runFrom(index + 1, { ...ctx, ...opts?.ctx });
							return { ctx: (opts?.ctx ?? {}) as never };
						},
					});
					return output as Output;
				};
				return runFrom(0, baseContext as unknown as Context);
			},
		};
	}
}

/** Inputs of chained `.input()` calls are merged, as tRPC does; validation errors are `BAD_REQUEST`. */
function parseInput(schemas: z.ZodType[], rawInput: unknown): unknown {
	if (schemas.length === 0) {
		return undefined;
	}
	let merged: unknown = undefined;
	for (const schema of schemas) {
		const result = schema.safeParse(rawInput);
		if (!result.success) {
			throw new HandlerError('BAD_REQUEST', z.prettifyError(result.error));
		}
		merged =
			typeof merged === 'object' && merged !== null && typeof result.data === 'object' && result.data !== null
				? { ...merged, ...result.data }
				: result.data;
	}
	return merged;
}

type AuthedContext = { user: AuthUser };
type ProjectContext = AuthedContext & { project: Project; userRole: UserRole | null };

/** Upstream `protectedProcedure`: the resolver's `AuthGuard` already required a session. */
export const protectedProcedure = new ProcedureBuilder<AuthedContext, unknown>().use(async ({ ctx, next }) => {
	if (!ctx.user) {
		throw new HandlerError('UNAUTHORIZED', 'Unauthorized');
	}
	return next();
});

/** Upstream `projectProtectedProcedure`: the selected project, resolved by `@ProjectAccess()`. */
export const projectProtectedProcedure = protectedProcedure.use<ProjectContext>(async ({ ctx, next }) => {
	const { project, userRole } = ctx as unknown as Partial<ProjectContext>;
	if (!project) {
		throw new HandlerError('BAD_REQUEST', 'No project configured');
	}
	return next({ ctx: { ...ctx, project, userRole: userRole ?? null } });
});

/** Upstream `canSendProcedure` (and `nonViewerProtectedProcedure`). */
export const canSendProcedure = projectProtectedProcedure.use(async ({ ctx, next }) => {
	if (ctx.userRole !== 'admin' && ctx.userRole !== 'user' && ctx.userRole !== 'context_admin') {
		throw new HandlerError('FORBIDDEN', 'Viewers cannot perform this action');
	}
	return next();
});

/** Upstream `adminProtectedProcedure`. */
export const adminProtectedProcedure = projectProtectedProcedure.use(async ({ ctx, next }) => {
	if (ctx.userRole !== 'admin') {
		throw new HandlerError('FORBIDDEN', 'Only admins can perform this action');
	}
	return next();
});

/**
 * Upstream `advancedSettingsProtectedProcedure`: the User role needs a user group showing all settings. quarry has
 * no user groups yet (Phase 6), so every project member passes, as with upstream's default group.
 */
export const advancedSettingsProtectedProcedure = projectProtectedProcedure;

/** quarry has no billing: upstream's cloud billing checks always pass. */
export function cloudBillingMiddleware<TContext>(resolveScope: (ctx: TContext) => { projectId?: string } | null) {
	return async ({ ctx, next }: MiddlewareOptions<TContext & Context, unknown>) => {
		const scope = resolveScope(ctx);
		return next({ ctx: { billingAccessVerifiedProjectId: scope?.projectId } });
	};
}

export const cloudBillingProjectProcedure = projectProtectedProcedure;
export const cloudBillingAdminProcedure = adminProtectedProcedure;

/** Upstream `ownedResourceProcedure`: the input's `<resource>Id` must belong to the user. */
export function ownedResourceProcedure(
	getOwnerId: (resourceId: string) => Promise<string | undefined | null>,
	resourceName: string,
) {
	return protectedProcedure.use(async ({ ctx, getRawInput, next }) => {
		const rawInput = (await getRawInput()) as Record<string, unknown>;
		const resourceId = rawInput[`${resourceName}Id`];
		if (typeof resourceId !== 'string') {
			throw new HandlerError('BAD_REQUEST', `${resourceName}Id is required.`);
		}
		const ownerId = await getOwnerId(resourceId);
		if (!ownerId) {
			throw new HandlerError('NOT_FOUND', `${resourceName} not found.`);
		}
		if (ownerId !== ctx.user.id) {
			throw new HandlerError('FORBIDDEN', `You are not authorized to modify this ${resourceName}.`);
		}
		return next();
	});
}

/**
 * Upstream `assertUserGroupFeatureForTrpc`: user groups are Phase 6, and without them every member has every
 * feature (upstream's default group), so this only checks the user still belongs to the project.
 */
export async function assertUserGroupFeatureForTrpc(
	projectId: string,
	userId: string,
	_feature: string,
): Promise<void> {
	const role = await projectQueries.getUserRoleInProject(projectId, userId);
	if (!role) {
		throw new HandlerError('FORBIDDEN', 'You do not have access to this project.');
	}
}

/** The procedures of a router, run by name. */
export type Router = Record<string, Procedure<unknown, unknown, unknown>>;

export async function runProcedure<R extends Router, K extends keyof R & string>(
	router: R,
	name: K,
	ctx: ProcedureBaseContext,
	input: unknown,
): Promise<R[K] extends Procedure<unknown, unknown, infer Output> ? Output : never> {
	const procedure = router[name];
	if (!procedure) {
		throw new HandlerError('NOT_FOUND', `Unknown procedure ${name}.`);
	}
	return (await procedure.run(ctx, input)) as never;
}
