import { Module } from '@nestjs/common';

import { ProjectsCoreModule } from '../projects/projects-core.module.js';
import { SkillService } from './skill.service.js';
import { SkillsResolver } from './skills.resolver.js';

/** Project skills (upstream `skill`): the list API and the service the agent loads skills with. */
@Module({
	imports: [ProjectsCoreModule],
	providers: [SkillService, SkillsResolver],
	exports: [SkillService],
})
export class SkillsModule {}
