import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { UserRole } from '@quarry/shared/types';

import type { AuthUser } from '../auth/auth.service.js';
import { ProjectAccess, ProjectNonViewer } from '../common/decorators/access.decorator.js';
import { CurrentProject, CurrentUser, CurrentUserRole } from '../common/decorators/current.decorator.js';
import type { Project } from '../generated/prisma/client.js';
import {
	CreateProjectQueryToolInput,
	PreviewProjectQueryToolInput,
	UpdateProjectQueryToolInput,
} from './dto/query-tool.input.js';
import { ProjectQueryTool, QueryToolColumn, QueryToolPreview } from './models/query-tool.model.js';
import { QueryToolService } from './query-tool.service.js';

/** Settings → Project → Query tools. Reading needs project access; running and writing need a non-viewer role. */
@Resolver(() => ProjectQueryTool)
export class QueryToolResolver {
	constructor(private readonly queryTools: QueryToolService) {}

	@ProjectAccess()
	@Query(() => [ProjectQueryTool], { description: 'Saved query tools of the project.' })
	projectQueryTools(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project,
		@CurrentUserRole() role: UserRole,
	): Promise<ProjectQueryTool[]> {
		return this.queryTools.list(project.id, { userId: user.id, role });
	}

	@ProjectAccess()
	@Query(() => ProjectQueryTool)
	projectQueryTool(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project,
		@CurrentUserRole() role: UserRole,
		@Args('id', { type: () => ID }) id: string,
	): Promise<ProjectQueryTool> {
		return this.queryTools.get(project.id, id, { userId: user.id, role });
	}

	@ProjectAccess()
	@Query(() => [QueryToolColumn], { description: 'Columns of a synced warehouse table, for the query builder.' })
	queryToolTableColumns(
		@CurrentProject() project: Project,
		@Args('type') type: string,
		@Args('database') database: string,
		@Args('schema') schema: string,
		@Args('table') table: string,
	): Promise<QueryToolColumn[]> {
		return this.queryTools.listTableColumns(project, { type, database, schema, table });
	}

	@ProjectNonViewer()
	@Mutation(() => ProjectQueryTool)
	createProjectQueryTool(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project,
		@CurrentUserRole() role: UserRole,
		@Args('input') input: CreateProjectQueryToolInput,
	): Promise<ProjectQueryTool> {
		return this.queryTools.create(project, { userId: user.id, role }, input);
	}

	@ProjectNonViewer()
	@Mutation(() => ProjectQueryTool, { description: 'Project admins and the creator of the tool only.' })
	updateProjectQueryTool(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project,
		@CurrentUserRole() role: UserRole,
		@Args('input') input: UpdateProjectQueryToolInput,
	): Promise<ProjectQueryTool> {
		const { id, ...changes } = input;
		return this.queryTools.update(project, { userId: user.id, role }, id, changes);
	}

	@ProjectNonViewer()
	@Mutation(() => Boolean, { description: 'Project admins and the creator of the tool only.' })
	deleteProjectQueryTool(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project,
		@CurrentUserRole() role: UserRole,
		@Args('id', { type: () => ID }) id: string,
	): Promise<boolean> {
		return this.queryTools.delete(project.id, { userId: user.id, role }, id);
	}

	@ProjectNonViewer()
	@Mutation(() => QueryToolPreview, {
		description: 'Runs a query tool draft on the warehouse with argument values (read-only, at most 200 rows).',
	})
	previewProjectQueryTool(
		@CurrentProject() project: Project,
		@Args('input') input: PreviewProjectQueryToolInput,
	): Promise<QueryToolPreview> {
		return this.queryTools.preview(project, input);
	}
}
