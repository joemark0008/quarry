import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { isSkillGranted } from '@quarry/shared';

import { fullProjectContextAccess } from '../agent/services/user-group-context-access.service.js';
import type { AuthUser } from '../auth/auth.service.js';
import { ProjectAccess } from '../common/decorators/access.decorator.js';
import { CurrentProject, CurrentUser } from '../common/decorators/current.decorator.js';
import { ProjectContextAdmin } from '../context-explorer/context-admin.decorator.js';
import type { Project } from '../generated/prisma/client.js';
import { CreateSkillInput, DeleteSkillInput, UpdateSkillInput } from './dto/skill.input.js';
import {
	CreatedSkill,
	Skill,
	SkillDetail,
	SkillLoadError,
	SkillSaveStatus,
	UpdatedSkill,
} from './models/skill.model.js';
import { SkillService } from './skill.service.js';
import { SkillAuthoringService } from './skill-authoring.service.js';

/**
 * Upstream tRPC `skill.*`, plus writing skills from the app. The Markdown files stay the source of truth.
 * User-group skill grants are Phase 6: every member sees every skill until then.
 */
@Resolver(() => Skill)
export class SkillsResolver {
	constructor(
		private readonly skillService: SkillService,
		private readonly authoring: SkillAuthoringService,
	) {}

	@ProjectAccess()
	@Query(() => [Skill], { description: 'The project skills the signed-in user may use (the `/` picker).' })
	async skills(@CurrentProject() project: Project): Promise<Skill[]> {
		await this.skillService.initializeSkills(project.id);
		const { skillsAccess } = fullProjectContextAccess();
		return this.skillService.getSkills(project.id).filter((skill) => isSkillGranted(skillsAccess, skill.name));
	}

	@ProjectContextAdmin()
	@Query(() => [Skill], { description: 'Every project skill, for the admin settings.' })
	async skillCatalog(@CurrentProject() project: Project): Promise<Skill[]> {
		await this.skillService.initializeSkills(project.id);
		return this.skillService.getSkills(project.id);
	}

	@ProjectContextAdmin()
	@Query(() => [SkillLoadError])
	async skillLoadErrors(@CurrentProject() project: Project): Promise<SkillLoadError[]> {
		await this.skillService.initializeSkills(project.id);
		return this.skillService.getSkillLoadErrors(project.id);
	}

	@ProjectContextAdmin()
	@Query(() => SkillSaveStatus)
	skillSaveStatus(@CurrentProject() project: Project, @CurrentUser() user: AuthUser): Promise<SkillSaveStatus> {
		return this.authoring.getSaveStatus(project, user);
	}

	@ProjectContextAdmin()
	@Query(() => SkillDetail)
	skillDetail(@CurrentProject() project: Project, @Args('name') name: string): Promise<SkillDetail> {
		return this.authoring.getDetail(project, name);
	}

	@ProjectContextAdmin()
	@Mutation(() => CreatedSkill)
	createSkill(
		@CurrentProject() project: Project,
		@CurrentUser() user: AuthUser,
		@Args('input') input: CreateSkillInput,
	): Promise<CreatedSkill> {
		return this.authoring.create(project, user, input);
	}

	@ProjectContextAdmin()
	@Mutation(() => UpdatedSkill, { description: 'Projects without a context repository only.' })
	updateSkill(
		@CurrentProject() project: Project,
		@CurrentUser() user: AuthUser,
		@Args('input') input: UpdateSkillInput,
	): Promise<UpdatedSkill> {
		return this.authoring.update(project, user, input);
	}

	@ProjectContextAdmin()
	@Mutation(() => Boolean, { description: 'Projects without a context repository only.' })
	deleteSkill(
		@CurrentProject() project: Project,
		@CurrentUser() user: AuthUser,
		@Args('input') input: DeleteSkillInput,
	): Promise<boolean> {
		return this.authoring.delete(project, user, input);
	}
}
