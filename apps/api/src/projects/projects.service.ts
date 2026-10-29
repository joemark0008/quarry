import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Injectable } from '@nestjs/common';
import type { UserRole } from '@quarry/shared/types';

import { HandlerError } from '../common/errors/handler-error.js';
import { ConfigService } from '../config/config.service.js';
import type { Project, ProjectSavedPrompt } from '../generated/prisma/client.js';
import { OrganizationRepository } from '../organizations/organization.repository.js';
import { PROJECT_CONFIG_FILE } from '../sql-engine/project-config.js';
import type { ProjectSummary } from './models/project.model.js';
import { ProjectRepository } from './project.repository.js';
import { ProjectSavedPromptRepository } from './project-saved-prompt.repository.js';

/** Port of upstream trpc `project` (core procedures) and `services/project*.ts`. */
@Injectable()
export class ProjectsService {
	constructor(
		private readonly projects: ProjectRepository,
		private readonly savedPrompts: ProjectSavedPromptRepository,
		private readonly organizations: OrganizationRepository,
		private readonly config: ConfigService,
	) {}

	async listForUser(userId: string): Promise<ProjectSummary[]> {
		const projects = await this.projects.listUserProjectsWithRoles(userId);
		return projects.map(({ project, userRole }) => toSummary(project, userRole));
	}

	async getCurrent(userId: string, selectedProjectId: string | null): Promise<ProjectSummary | null> {
		const project = await this.projects.getProjectByUserId(userId, selectedProjectId);
		if (!project) {
			return null;
		}
		const userRole = await this.projects.getUserRoleInProject(project.id, userId);
		return userRole ? toSummary(project, userRole) : null;
	}

	/**
	 * quarry addition (upstream self-hosted has one project from `NAO_DEFAULT_PROJECT_PATH`): a project gets a
	 * folder under `QUARRY_PROJECTS_DIR` for its context, in the user's organization, with the user as admin.
	 */
	async createProject(userId: string, name: string): Promise<ProjectSummary> {
		const trimmed = name.trim();
		const membership = await this.organizations.getUserOrgMembership(userId);
		const orgId = membership?.orgId ?? null;
		if (await this.projects.isProjectNameTaken(orgId, trimmed)) {
			throw new HandlerError('CONFLICT', `A project named "${trimmed}" already exists.`);
		}

		const id = randomUUID();
		const folder = path.join(this.projectsDir(), `${slugify(trimmed)}-${id.slice(0, 8)}`);
		await mkdir(folder, { recursive: true });
		await writeFile(
			path.join(folder, PROJECT_CONFIG_FILE),
			`project_name: ${JSON.stringify(trimmed)}\ndatabases: []\n`,
		);
		try {
			const project = await this.projects.createProject({
				id,
				name: trimmed,
				type: 'local',
				path: folder,
				orgId,
			});
			await this.projects.addProjectMember({ projectId: project.id, userId, role: 'admin' });
			return toSummary(project, 'admin');
		} catch (error) {
			await rm(folder, { recursive: true, force: true });
			throw error;
		}
	}

	async renameProject(project: Project, projectId: string, name: string): Promise<ProjectSummary> {
		if (projectId !== project.id) {
			throw new HandlerError('CONFLICT', 'The selected project changed. Reload the page and try again.');
		}
		const trimmed = name.trim();
		if (!(await this.projects.renameProject(project.id, project.orgId, trimmed))) {
			throw new HandlerError('CONFLICT', `A project named "${trimmed}" already exists.`);
		}
		return toSummary({ ...project, name: trimmed }, 'admin');
	}

	/** Deletes the project; its folder too when quarry created it under `QUARRY_PROJECTS_DIR`. */
	async deleteProject(project: Project): Promise<void> {
		await this.projects.deleteProject(project.id);
		if (project.path && isInside(this.projectsDir(), project.path)) {
			await rm(project.path, { recursive: true, force: true });
		}
	}

	listSavedPrompts(projectId: string): Promise<ProjectSavedPrompt[]> {
		return this.savedPrompts.listSavedPrompts(projectId);
	}

	createSavedPrompt(projectId: string, title: string, prompt: string): Promise<ProjectSavedPrompt> {
		return this.savedPrompts.createSavedPrompt({ projectId, title, prompt });
	}

	async updateSavedPrompt(
		projectId: string,
		promptId: string,
		data: { title?: string; prompt?: string },
	): Promise<ProjectSavedPrompt> {
		const updated = await this.savedPrompts.updateSavedPrompt(projectId, promptId, data);
		if (!updated) {
			throw new HandlerError('NOT_FOUND', 'Saved prompt not found');
		}
		return updated;
	}

	deleteSavedPrompt(projectId: string, promptId: string): Promise<void> {
		return this.savedPrompts.deleteSavedPrompt(projectId, promptId);
	}

	private projectsDir(): string {
		return path.resolve(this.config.env.QUARRY_PROJECTS_DIR);
	}
}

function toSummary(project: Project, userRole: UserRole): ProjectSummary {
	return {
		id: project.id,
		name: project.name,
		type: project.type,
		path: project.path,
		orgId: project.orgId,
		userRole,
		createdAt: project.createdAt,
		updatedAt: project.updatedAt,
	};
}

function slugify(name: string): string {
	return (
		name
			.toLowerCase()
			.normalize('NFKD')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 40) || 'project'
	);
}

function isInside(parent: string, child: string): boolean {
	const relative = path.relative(parent, path.resolve(child));
	return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}
