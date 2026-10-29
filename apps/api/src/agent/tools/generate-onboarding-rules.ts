import { generateOnboardingRules } from '@quarry/shared/tools';

import { createTool } from '../utils/tools.js';

/**
 * Port of upstream `generate-onboarding-rules.ts`. Upstream queued the finalization of the onboarding's warehouse
 * provisioning job (`jobId`); quarry has no provisioning (PHASES.md 1a), so the rules are generated for the run's
 * project in the background and `jobId` is echoed back.
 */
export default createTool<generateOnboardingRules.Input, generateOnboardingRules.Output>({
	description:
		'Generate the initial RULES.md from synced warehouse metadata and the business context collected during onboarding, then finish project setup.',
	inputSchema: generateOnboardingRules.InputSchema,
	outputSchema: generateOnboardingRules.OutputSchema,
	execute: async ({ jobId, businessContext }, context) => {
		if (!context.modelSelection) {
			throw new Error('The onboarding model is unavailable');
		}
		context.services.scheduleOnboardingRules(context.projectId, businessContext, context.modelSelection);

		return {
			_version: '1',
			jobId,
			status: 'finalizing',
		};
	},
	toModelOutput: () => ({
		type: 'text',
		value: 'Project finalization started in the background. Tell the user it is continuing, then end this turn.',
	}),
});
