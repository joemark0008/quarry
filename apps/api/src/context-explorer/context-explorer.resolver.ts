import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

import { CurrentProject } from '../common/decorators/current.decorator.js';
import type { Project } from '../generated/prisma/client.js';
import { ProjectContextAdmin } from './context-admin.decorator.js';
import { ContextExplorerService } from './context-explorer.service.js';

/**
 * Settings → File Explorer (upstream tRPC `contextExplorer.*`). Results are JSON in upstream's shapes so the explorer
 * screens only swap their call sites; inputs are checked with upstream's zod schemas in the service.
 */
@Resolver()
@ProjectContextAdmin()
export class ContextExplorerResolver {
	constructor(private readonly contextExplorer: ContextExplorerService) {}

	@Query(() => GraphQLJSON, { description: 'Upstream `contextExplorer.getFileTree`: `{ entries }`.' })
	contextFileTree(@CurrentProject() project: Project) {
		return this.contextExplorer.getFileTree(project);
	}

	@Query(() => GraphQLJSON, { description: 'Upstream `contextExplorer.getRulesPreviewGroups`.' })
	contextRulesPreviewGroups(@CurrentProject() project: Project) {
		return this.contextExplorer.getRulesPreviewGroups(project);
	}

	@Query(() => GraphQLJSON, { description: 'Upstream `contextExplorer.readFile`.' })
	contextFile(@CurrentProject() project: Project, @Args('path') path: string) {
		return this.contextExplorer.readFile(project, path);
	}

	@Mutation(() => GraphQLJSON, {
		description: 'Upstream `contextExplorer.writeFile`: `{ path, content, expectedHash }`.',
	})
	writeContextFile(@CurrentProject() project: Project, @Args('input', { type: () => GraphQLJSON }) input: unknown) {
		return this.contextExplorer.writeFile(project, input);
	}

	@Query(() => GraphQLJSON, { description: 'Upstream `contextExplorer.searchContent`.' })
	contextSearch(@CurrentProject() project: Project, @Args('query') query: string) {
		return this.contextExplorer.searchContent(project, query);
	}
}
