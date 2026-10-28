import { Injectable } from '@nestjs/common';

import { ConfigService } from '../config/config.service.js';
import type { Organization, OrgMember, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { DbExecutor } from '../prisma/prisma.types.js';
import { ProjectRepository } from '../projects/project.repository.js';

export type OrgRole = 'admin' | 'user' | 'viewer';

export type UserOrgMembership = OrgMember & { organization: Organization };

/** Port of upstream `queries/organization.queries.ts` (the part Phase 1 needs: membership and first-user setup). */
@Injectable()
export class OrganizationRepository {
	constructor(
		private readonly prisma: PrismaService,
		private readonly config: ConfigService,
		private readonly projects: ProjectRepository,
	) {}

	getFirstOrganization(executor: DbExecutor = this.prisma): Promise<Organization | null> {
		return executor.organization.findFirst();
	}

	getOrganizationBySlug(slug: string): Promise<Organization | null> {
		return this.prisma.organization.findUnique({ where: { slug } });
	}

	createOrganization(org: Prisma.OrganizationCreateInput, executor: DbExecutor = this.prisma): Promise<Organization> {
		return executor.organization.create({ data: org });
	}

	getOrgMember(orgId: string, userId: string, executor: DbExecutor = this.prisma): Promise<OrgMember | null> {
		return executor.orgMember.findUnique({ where: { orgId_userId: { orgId, userId } } });
	}

	async addOrgMemberIfMissing(
		member: Prisma.OrgMemberUncheckedCreateInput,
		executor: DbExecutor = this.prisma,
	): Promise<void> {
		await executor.orgMember.createMany({ data: [member], skipDuplicates: true });
	}

	/** The user's oldest organization membership, or the one in `selectedOrganizationId`. */
	getUserOrgMembership(userId: string, selectedOrganizationId?: string | null): Promise<UserOrgMembership | null> {
		return this.prisma.orgMember.findFirst({
			where: selectedOrganizationId ? { userId, orgId: selectedOrganizationId } : { userId },
			include: { organization: true },
			orderBy: { createdAt: 'asc' },
		});
	}

	getUserOrgMembershipByProject(userId: string, projectId: string): Promise<UserOrgMembership | null> {
		return this.prisma.orgMember.findFirst({
			where: { userId, organization: { projects: { some: { id: projectId } } } },
			include: { organization: true },
		});
	}

	/**
	 * First sign-up of a self-hosted instance: creates the default organization with the user as
	 * admin and, when NAO_DEFAULT_PROJECT_PATH is set, the default project with the user as admin.
	 */
	async initializeDefaultOrganizationForFirstUser(userId: string): Promise<void> {
		if ((await this.prisma.user.count()) !== 1) {
			return;
		}
		if (await this.getFirstOrganization()) {
			return;
		}

		await this.prisma.$transaction(async (tx) => {
			const org = await tx.organization.create({ data: { name: 'Default Organization', slug: 'default' } });
			await tx.orgMember.create({ data: { orgId: org.id, userId, role: 'admin' } });

			const projectPath = this.config.env.NAO_DEFAULT_PROJECT_PATH;
			if (projectPath && !(await this.projects.getProjectByPath(projectPath, tx))) {
				const projectName = projectPath.split('/').pop() || 'Default Project';
				const project = await this.projects.createProject(
					{ name: projectName, type: 'local', path: projectPath, orgId: org.id },
					tx,
				);
				await tx.projectMember.create({ data: { projectId: project.id, userId, role: 'admin' } });
			}
		});
	}

	async addUserToDefaultOrganizationIfExists(userId: string): Promise<void> {
		if (await this.getUserOrgMembership(userId)) {
			return;
		}
		const org = await this.getFirstOrganization();
		if (!org) {
			return;
		}
		await this.addOrgMemberIfMissing({ orgId: org.id, userId, role: this.config.env.DEFAULT_USER_ROLE });
	}

	/** Adds a user to the default organization and project. Idempotent. */
	async addUserToDefaultProjectIfExists(userId: string): Promise<void> {
		const org = await this.getFirstOrganization();
		if (!org) {
			return;
		}
		const project = await this.projects.getDefaultProject();
		if (!project) {
			return;
		}

		const role = this.config.env.DEFAULT_USER_ROLE;
		await this.prisma.$transaction(async (tx) => {
			await this.addOrgMemberIfMissing({ orgId: org.id, userId, role }, tx);
			await tx.projectMember.createMany({
				data: [{ projectId: project.id, userId, role }],
				skipDuplicates: true,
			});
		});
	}
}
