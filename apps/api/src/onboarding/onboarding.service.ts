import { Injectable, Logger } from '@nestjs/common';
import type { LlmSelectedModel } from '@quarry/shared/types';

import { LlmService } from '../agent/llm/llm.service.js';
import { HandlerError } from '../common/errors/handler-error.js';
import { type BusinessContext, OnboardingRulesService } from './onboarding-rules.service.js';

@Injectable()
export class OnboardingService {
	private readonly logger = new Logger(OnboardingService.name);

	constructor(
		private readonly rules: OnboardingRulesService,
		private readonly llm: LlmService,
	) {}

	async generateRules(projectId: string, businessContext: BusinessContext): Promise<void> {
		const model = await this.llm.resolveDefaultChatModel(projectId);
		if (!model) {
			throw new HandlerError('BAD_REQUEST', 'Configure a model before generating RULES.md.');
		}
		await this.rules.generateOnboardingRules(projectId, businessContext, model);
	}

	/** `generate_onboarding_rules`: upstream queued the provisioning job's finalization; quarry runs it in the background. */
	scheduleRules(projectId: string, businessContext: BusinessContext, modelSelection: LlmSelectedModel): void {
		this.rules.generateOnboardingRules(projectId, businessContext, modelSelection).catch((error) => {
			this.logger.error(`Generating RULES.md for project ${projectId} failed: ${String(error)}`);
		});
	}
}
