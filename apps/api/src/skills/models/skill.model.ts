import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'A project skill: a Markdown playbook in `agent/skills/`.' })
export class Skill {
	@Field()
	name: string;

	@Field()
	description: string;

	@Field({ description: 'Project path of the skill file, e.g. `/agent/skills/churn.md`.' })
	location: string;
}

@ObjectType({ description: 'A skill file that could not be loaded.' })
export class SkillLoadError {
	@Field()
	location: string;

	@Field()
	message: string;
}
