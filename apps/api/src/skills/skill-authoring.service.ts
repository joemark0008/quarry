import { Injectable } from '@nestjs/common';
import type { SkillDraft, SkillSaveMode } from '@quarry/shared/skill-authoring';
import { SkillDraftSchema, skillFilePath } from '@quarry/shared/skill-authoring';
import matter from 'gray-matter';

import { findInternalSkill } from '../agent/skills/index.js';
import type { AuthUser } from '../auth/auth.service.js';
import { HandlerError } from '../common/errors/handler-error.js';
import { ConfigService } from '../config/config.service.js';
import type { ContextWriteTarget } from '../context-explorer/context-explorer.service.js';
import { ContextExplorerService } from '../context-explorer/context-explorer.service.js';
import {
	createContextFile,
	hashContent,
	overwriteContextFile,
	removeContextFile,
} from '../context-explorer/files/context-files.js';
import type { Project } from '../generated/prisma/client.js';
import { SkillService } from './skill.service.js';

const DISABLED_MESSAGE = 'This deployment manages skills as files, so they cannot be edited in the app.';
const GIT_MANAGED_MESSAGE = 'This project keeps skills in Git. Edit them in the File Explorer.';

/**
 * Writing project skills from the app. The Markdown file stays the source of truth: `direct` projects (no context
 * repository) write to the live folder, `git` projects write to the user's worktree for review.
 */
@Injectable()
export class SkillAuthoringService {
	constructor(
		private readonly skills: SkillService,
		private readonly contextExplorer: ContextExplorerService,
		private readonly config: ConfigService,
	) {}

	async getSaveStatus(project: Project, user: AuthUser): Promise<{ mode: SkillSaveMode; message: string | null }> {
		const target = await this.resolveTarget(project, user);
		return { mode: target.mode, message: 'message' in target ? target.message : null };
	}

	async getDetail(project: Project, name: string) {
		await this.skills.initializeSkills(project.id);
		const { rawContent, skill } = this.readSkill(project.id, name);
		const { data, content } = matter(rawContent);
		return {
			name: skill.name,
			description: typeof data.description === 'string' ? data.description : '',
			body: content.trim(),
			hash: hashContent(Buffer.from(rawContent)),
		};
	}

	async create(project: Project, user: AuthUser, input: SkillDraft) {
		const draft = parseDraft(input);
		const target = await this.resolveTarget(project, user);
		if ('message' in target) {
			throw new HandlerError('FORBIDDEN', target.message);
		}
		await this.skills.initializeSkills(project.id);
		if (findInternalSkill(draft.name) || this.skills.getSkill(project.id, draft.name)) {
			throw new HandlerError('CONFLICT', `A skill called '${draft.name}' already exists.`);
		}

		const location = skillFilePath(draft.name);
		createContextFile(location, renderSkillFile(draft), target.root);
		if (target.mode === 'direct') {
			this.skills.reloadSkills(project.id);
		}
		return { name: draft.name, location, mode: target.mode };
	}

	async update(project: Project, user: AuthUser, input: SkillDraft & { expectedHash: string }) {
		const root = await this.requireDirectRoot(project, user);
		await this.skills.initializeSkills(project.id);
		const { rawContent, skill } = this.readSkill(project.id, input.name);
		// The name stays as it is, even a hand-written one the builder wouldn't accept for a new skill.
		const { description, body } = SkillDraftSchema.pick({ description: true, body: true }).parse(input);
		const hash = overwriteContextFile(
			skill.location,
			matter.stringify(body, { ...matter(rawContent).data, name: skill.name, description }),
			input.expectedHash,
			root,
		);
		this.skills.reloadSkills(project.id);
		return { name: skill.name, hash };
	}

	async delete(project: Project, user: AuthUser, input: { name: string; expectedHash: string }): Promise<boolean> {
		const root = await this.requireDirectRoot(project, user);
		await this.skills.initializeSkills(project.id);
		const { skill } = this.readSkill(project.id, input.name);
		removeContextFile(skill.location, input.expectedHash, root);
		this.skills.reloadSkills(project.id);
		return true;
	}

	private async resolveTarget(project: Project, user: AuthUser): Promise<ContextWriteTarget> {
		if (this.config.env.QUARRY_SKILL_AUTHORING === 'off') {
			return { mode: 'disabled', message: DISABLED_MESSAGE };
		}
		return this.contextExplorer.resolveWriteTarget(project, user);
	}

	private async requireDirectRoot(project: Project, user: AuthUser): Promise<string> {
		const target = await this.resolveTarget(project, user);
		if (target.mode === 'direct') {
			return target.root;
		}
		throw new HandlerError('FORBIDDEN', 'message' in target ? target.message : GIT_MANAGED_MESSAGE);
	}

	private readSkill(projectId: string, name: string) {
		const skill = this.skills.getSkill(projectId, name);
		const rawContent = skill && this.skills.getSkillContent(projectId, skill.name);
		if (!skill || !rawContent) {
			throw new HandlerError('NOT_FOUND', `There is no skill called '${name}'.`);
		}
		return { skill, rawContent };
	}
}

function parseDraft(input: SkillDraft): SkillDraft {
	const parsed = SkillDraftSchema.safeParse(input);
	if (!parsed.success) {
		throw new HandlerError('BAD_REQUEST', parsed.error.issues[0]?.message ?? 'Invalid skill.');
	}
	return parsed.data;
}

function renderSkillFile({ name, description, body }: SkillDraft): string {
	return matter.stringify(body, { name, description });
}
