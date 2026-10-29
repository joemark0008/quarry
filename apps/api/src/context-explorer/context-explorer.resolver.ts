import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

import type { AuthUser } from '../auth/auth.service.js';
import { ProjectAdmin } from '../common/decorators/access.decorator.js';
import { CurrentProject, CurrentUser } from '../common/decorators/current.decorator.js';
import type { Project } from '../generated/prisma/client.js';
import { ProjectContextAdmin } from './context-admin.decorator.js';
import { ContextExplorerService } from './context-explorer.service.js';

/**
 * Settings → Context explorer and Git (upstream tRPC `contextExplorer.*`). Results are JSON in upstream's shapes so
 * the explorer screens only swap their call sites; inputs are checked with upstream's zod schemas in the service.
 */
@Resolver()
@ProjectContextAdmin()
export class ContextExplorerResolver {
	constructor(private readonly contextExplorer: ContextExplorerService) {}

	@Query(() => GraphQLJSON, { description: 'Upstream `contextExplorer.getRepositoryStatus`.' })
	contextRepositoryStatus(@CurrentProject() project: Project, @CurrentUser() user: AuthUser) {
		return this.contextExplorer.getRepositoryStatus(project, user);
	}

	@Query(() => GraphQLJSON, { description: 'Upstream `contextExplorer.getLiveContextPullHistory`.' })
	contextPullHistory(@CurrentProject() project: Project, @CurrentUser() user: AuthUser) {
		return this.contextExplorer.getLiveContextPullHistory(project, user);
	}

	@ProjectAdmin()
	@Mutation(() => GraphQLJSON, {
		description: 'Upstream `contextExplorer.pullLiveContext` (project admins only, not context admins).',
	})
	pullLiveContext(@CurrentProject() project: Project, @CurrentUser() user: AuthUser) {
		return this.contextExplorer.pullLiveContext(project, user);
	}

	@Mutation(() => GraphQLJSON, {
		description: 'Upstream `contextExplorer.connectRepository`: `{ provider, repoFullName }`.',
	})
	connectContextRepository(
		@CurrentProject() project: Project,
		@CurrentUser() user: AuthUser,
		@Args('input', { type: () => GraphQLJSON }) input: unknown,
	) {
		return this.contextExplorer.connectRepository(project, user, input);
	}

	@Mutation(() => GraphQLJSON, { description: 'Upstream `contextExplorer.disconnectRepository`.' })
	disconnectContextRepository(@CurrentProject() project: Project, @CurrentUser() user: AuthUser) {
		return this.contextExplorer.disconnectRepository(project, user);
	}

	@Query(() => GraphQLJSON, { description: 'Upstream `contextExplorer.getFileTree`: `{ entries }`.' })
	contextFileTree(@CurrentProject() project: Project) {
		return this.contextExplorer.getFileTree(project);
	}

	@Query(() => GraphQLJSON, { description: 'Upstream `contextExplorer.getRulesPreviewGroups`.' })
	contextRulesPreviewGroups(@CurrentProject() project: Project) {
		return this.contextExplorer.getRulesPreviewGroups(project);
	}

	@Query(() => GraphQLJSON, { description: 'Upstream `contextExplorer.readFile`.' })
	contextFile(@CurrentProject() project: Project, @CurrentUser() user: AuthUser, @Args('path') path: string) {
		return this.contextExplorer.readFile(project, user, path);
	}

	@Mutation(() => GraphQLJSON, {
		description: 'Upstream `contextExplorer.writeFile`: `{ path, content, expectedHash }`.',
	})
	writeContextFile(
		@CurrentProject() project: Project,
		@CurrentUser() user: AuthUser,
		@Args('input', { type: () => GraphQLJSON }) input: unknown,
	) {
		return this.contextExplorer.writeFile(project, user, input);
	}

	@Query(() => GraphQLJSON, { description: 'Upstream `contextExplorer.searchContent`.' })
	contextSearch(@CurrentProject() project: Project, @Args('query') query: string) {
		return this.contextExplorer.searchContent(project, query);
	}

	@Query(() => GraphQLJSON, { description: 'Upstream `contextExplorer.getChangedFiles`.' })
	contextChangedFiles(@CurrentProject() project: Project, @CurrentUser() user: AuthUser) {
		return this.contextExplorer.getChangedFiles(project, user);
	}

	@Query(() => GraphQLJSON, { description: 'Upstream `contextExplorer.getFileDiff`: `{ path, from?, to? }`.' })
	contextFileDiff(
		@CurrentProject() project: Project,
		@CurrentUser() user: AuthUser,
		@Args('input', { type: () => GraphQLJSON }) input: unknown,
	) {
		return this.contextExplorer.getFileDiff(project, user, input);
	}

	@Query(() => GraphQLJSON, { description: 'Upstream `contextExplorer.getHistoricalDiffAction`: `{ from, to }`.' })
	contextHistoricalDiffAction(
		@CurrentProject() project: Project,
		@CurrentUser() user: AuthUser,
		@Args('input', { type: () => GraphQLJSON }) input: unknown,
	) {
		return this.contextExplorer.getHistoricalDiffAction(project, user, input);
	}

	@Mutation(() => GraphQLJSON, { description: 'Upstream `contextExplorer.updateWorktree`.' })
	updateContextWorktree(
		@CurrentProject() project: Project,
		@CurrentUser() user: AuthUser,
		@Args('requiredCommits', { type: () => [String], nullable: true }) requiredCommits: string[] | null,
	) {
		return this.contextExplorer.updateWorktree(project, user, requiredCommits);
	}

	@Mutation(() => GraphQLJSON, { description: 'Upstream `contextExplorer.switchBranch`.' })
	switchContextBranch(
		@CurrentProject() project: Project,
		@CurrentUser() user: AuthUser,
		@Args('branch') branch: string,
	) {
		return this.contextExplorer.switchBranch(project, user, branch);
	}

	@Mutation(() => GraphQLJSON, { description: 'Upstream `contextExplorer.createBranch`.' })
	createContextBranch(
		@CurrentProject() project: Project,
		@CurrentUser() user: AuthUser,
		@Args('branch') branch: string,
	) {
		return this.contextExplorer.createBranch(project, user, branch);
	}

	@Query(() => GraphQLJSON, { description: 'Upstream `contextExplorer.suggestBranchName`.' })
	contextBranchNameSuggestion(@CurrentProject() project: Project, @CurrentUser() user: AuthUser) {
		return this.contextExplorer.suggestBranchName(project, user);
	}

	@Mutation(() => GraphQLJSON, {
		description: 'Upstream `contextExplorer.createBranchAndCommit`: `{ branch?, paths, message }`.',
	})
	createContextBranchAndCommit(
		@CurrentProject() project: Project,
		@CurrentUser() user: AuthUser,
		@Args('input', { type: () => GraphQLJSON }) input: unknown,
	) {
		return this.contextExplorer.createBranchAndCommit(project, user, input);
	}

	@Mutation(() => GraphQLJSON, { description: 'Upstream `contextExplorer.commitChanges`: `{ paths, message }`.' })
	commitContextChanges(
		@CurrentProject() project: Project,
		@CurrentUser() user: AuthUser,
		@Args('input', { type: () => GraphQLJSON }) input: unknown,
	) {
		return this.contextExplorer.commitChanges(project, user, input);
	}

	@Mutation(() => GraphQLJSON, { description: 'Upstream `contextExplorer.discardLocalChange`.' })
	discardContextFileChange(
		@CurrentProject() project: Project,
		@CurrentUser() user: AuthUser,
		@Args('path') path: string,
	) {
		return this.contextExplorer.discardLocalChange(project, user, path);
	}

	@Mutation(() => GraphQLJSON, { description: 'Upstream `contextExplorer.discardAllChanges`.' })
	discardAllContextChanges(@CurrentProject() project: Project, @CurrentUser() user: AuthUser) {
		return this.contextExplorer.discardAllChanges(project, user);
	}

	@Mutation(() => GraphQLJSON, { description: 'Upstream `contextExplorer.pushBranch`.' })
	pushContextBranch(@CurrentProject() project: Project, @CurrentUser() user: AuthUser) {
		return this.contextExplorer.pushBranch(project, user);
	}
}
