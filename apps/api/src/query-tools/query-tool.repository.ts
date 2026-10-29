import { Injectable } from '@nestjs/common';

import type { Prisma, ProjectQueryTool } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type QueryToolValues = Pick<
	ProjectQueryTool,
	'name' | 'description' | 'sqlTemplate' | 'databaseId' | 'enabled'
> & { parameters: Prisma.InputJsonValue };

/** Saved query tools of a project (`project_query_tool`). */
@Injectable()
export class QueryToolRepository {
	constructor(private readonly prisma: PrismaService) {}

	listByProject(projectId: string, options: { enabledOnly?: boolean } = {}): Promise<ProjectQueryTool[]> {
		return this.prisma.projectQueryTool.findMany({
			where: { projectId, ...(options.enabledOnly && { enabled: true }) },
			orderBy: { name: 'asc' },
		});
	}

	findById(projectId: string, id: string): Promise<ProjectQueryTool | null> {
		return this.prisma.projectQueryTool.findFirst({ where: { id, projectId } });
	}

	findByName(projectId: string, name: string): Promise<ProjectQueryTool | null> {
		return this.prisma.projectQueryTool.findUnique({ where: { projectId_name: { projectId, name } } });
	}

	create(projectId: string, createdBy: string, values: QueryToolValues): Promise<ProjectQueryTool> {
		return this.prisma.projectQueryTool.create({ data: { ...values, projectId, createdBy } });
	}

	update(id: string, values: Partial<QueryToolValues>): Promise<ProjectQueryTool> {
		return this.prisma.projectQueryTool.update({ where: { id }, data: values });
	}

	async delete(projectId: string, id: string): Promise<boolean> {
		const { count } = await this.prisma.projectQueryTool.deleteMany({ where: { id, projectId } });
		return count > 0;
	}
}
