import type { UserRole } from '@nao/shared/types';
import { Injectable } from '@nestjs/common';

import { ConfigService } from '../config/config.service.js';
import type { Prisma, Project, ProjectMember } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { DbExecutor } from '../prisma/prisma.types.js';
import { defaultUserGroupValues } from './default-user-group.js';

/** Port of upstream `queries/project.queries.ts` (the part Phase 1 needs: lookup, membership, roles). */
@Injectable()
export class ProjectRepository {
	constructor(
		private readonly prisma: PrismaService,
		private readonly config: ConfigService,
	) {}

	getProjectById(projectId: string): Promise<Project | null> {
		return this.prisma.project.findUnique({ where: { id: projectId } });
	}

	getProjectByPath(path: string, executor: DbExecutor = this.prisma): Promise<Project | null> {
		return executor.project.findFirst({ where: { path } });
	}

	/** Creates a project together with its default "All Users" group. */
	async createProject(
		project: Prisma.ProjectUncheckedCreateInput,
		executor?: Prisma.TransactionClient,
	): Promise<Project> {
		const create = async (tx: Prisma.TransactionClient) => {
			const created = await tx.project.create({ data: project });
			await tx.userGroup.create({ data: defaultUserGroupValues(created.id) });
			return created;
		};
		return executor ? create(executor) : this.prisma.$transaction(create);
	}

	getProjectMember(
		projectId: string,
		userId: string,
		executor: DbExecutor = this.prisma,
	): Promise<ProjectMember | null> {
		return executor.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } });
	}

	addProjectMember(
		member: Prisma.ProjectMemberUncheckedCreateInput,
		executor: DbExecutor = this.prisma,
	): Promise<ProjectMember> {
		return executor.projectMember.create({ data: member });
	}

	async getDefaultProject(): Promise<Project | null> {
		const projectPath = this.config.env.NAO_DEFAULT_PROJECT_PATH;
		if (projectPath) {
			return this.getProjectByPath(projectPath);
		}
		return this.prisma.project.findFirst();
	}

	/** Self-hosted: the default project, when the user has a role in it. */
	async getProjectByUserId(userId: string, _selectedProjectId?: string | null): Promise<Project | null> {
		const project = await this.getDefaultProject();
		if (!project) {
			return null;
		}
		const role = await this.getUserRoleInProject(project.id, userId);
		return role ? project : null;
	}

	/** Project membership role, falling back to the user's organization role. */
	async getUserRoleInProject(projectId: string, userId: string): Promise<UserRole | null> {
		const member = await this.getProjectMember(projectId, userId);
		if (member) {
			return member.role as UserRole;
		}

		const project = await this.getProjectById(projectId);
		if (!project?.orgId) {
			return null;
		}

		const orgMember = await this.prisma.orgMember.findUnique({
			where: { orgId_userId: { orgId: project.orgId, userId } },
			select: { role: true },
		});
		return orgMember ? (orgMember.role as UserRole) : null;
	}
}
