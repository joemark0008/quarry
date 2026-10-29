import { Query, Resolver } from '@nestjs/graphql';
import { isSkillGranted } from '@quarry/shared';

import { fullProjectContextAccess } from '../agent/services/user-group-context-access.service.js';
import { ProjectAccess, ProjectAdmin } from '../common/decorators/access.decorator.js';
import { CurrentProject } from '../common/decorators/current.decorator.js';
import type { Project } from '../generated/prisma/client.js';
import { Skill, SkillLoadError } from './models/skill.model.js';
import { SkillService } from './skill.service.js';

/**
 * Upstream tRPC `skill.*`. Skills are edited as files in the context explorer, so there is no write API.
 * User-group skill grants are Phase 6: every member sees every skill until then.
 */
@Resolver(() => Skill)
export class SkillsResolver {
	constructor(private readonly skillService: SkillService) {}

	@ProjectAccess()
	@Query(() => [Skill], { description: 'The project skills the signed-in user may use (the `/` picker).' })
	async skills(@CurrentProject() project: Project): Promise<Skill[]> {
		await this.skillService.initializeSkills(project.id);
		const { skillsAccess } = fullProjectContextAccess();
		return this.skillService.getSkills(project.id).filter((skill) => isSkillGranted(skillsAccess, skill.name));
	}

	@ProjectAdmin()
	@Query(() => [Skill], { description: 'Every project skill, for the admin settings.' })
	async skillCatalog(@CurrentProject() project: Project): Promise<Skill[]> {
		await this.skillService.initializeSkills(project.id);
		return this.skillService.getSkills(project.id);
	}

	@ProjectAdmin()
	@Query(() => [SkillLoadError])
	async skillLoadErrors(@CurrentProject() project: Project): Promise<SkillLoadError[]> {
		await this.skillService.initializeSkills(project.id);
		return this.skillService.getSkillLoadErrors(project.id);
	}
}
