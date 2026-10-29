import { Injectable } from '@nestjs/common';

import { type ProcedureBaseContext, type Router, runProcedure } from './procedure.js';

/**
 * Runs upstream's story procedures (`procedures/*.procedures.ts`, ports of the tRPC routers `story`, `storyFolder`,
 * `storyTheme` and `customStoryViewer`) for the GraphQL resolvers: input validation, access middlewares, handler.
 */
@Injectable()
export class StoriesService {
	run<R extends Router, K extends keyof R & string>(
		router: R,
		name: K,
		ctx: ProcedureBaseContext,
		input: unknown,
	): Promise<unknown> {
		return runProcedure(router, name, ctx, input ?? undefined);
	}
}
