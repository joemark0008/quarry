import type { ToolCallComponentProps } from '.';
import { AgentPromptCard } from '@/components/agent-prompt-card';
import styles from './onboarding-agent-prompt.module.css';

export function OnboardingAgentPromptToolCall({ toolPart }: ToolCallComponentProps<'onboarding_agent_prompt'>) {
	const prompt = toolPart.input?.prompt;

	if (!prompt) {
		return null;
	}

	return (
		<div className={styles.onboardingAgentPromptToolCallDiv}>
			<AgentPromptCard prompt={prompt} />
		</div>
	);
}
