import { Args, Mutation, Resolver } from '@nestjs/graphql';

import { ProjectAdmin } from '../common/decorators/access.decorator.js';
import { CurrentProject } from '../common/decorators/current.decorator.js';
import type { Project } from '../generated/prisma/client.js';
import { GenerateOnboardingRulesInput } from './dto/generate-onboarding-rules.input.js';
import { OnboardingService } from './onboarding.service.js';

/**
 * quarry's entry to upstream's onboarding finalization: RULES.md generated from the synced context. Upstream's
 * `onboarding.*` tRPC procedures (warehouse provisioning on the example project) are not ported (PHASES.md 1a).
 */
@Resolver()
export class OnboardingResolver {
	constructor(private readonly onboarding: OnboardingService) {}

	@ProjectAdmin()
	@Mutation(() => Boolean, {
		description:
			"Writes the project's RULES.md from its synced context with the default chat model; overwrites it.",
	})
	async generateOnboardingRules(
		@CurrentProject() project: Project,
		@Args('input') input: GenerateOnboardingRulesInput,
	): Promise<boolean> {
		await this.onboarding.generateRules(project.id, {
			...(input.additionalContext?.trim() && { additionalContext: input.additionalContext.trim() }),
		});
		return true;
	}
}
