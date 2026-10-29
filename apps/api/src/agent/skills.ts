/**
 * Internal skills (upstream `agents/skills`): playbooks the agent loads with `load_skill`, which arrives with the
 * `skills` module (Phase 3). The system prompt only lists them when `load_skill` is in the tool set.
 */
export interface InternalSkill {
	name: string;
	/** Shown in the system prompt catalog, so it has to say when the skill is worth loading. */
	description: string;
	body: (capabilities: SkillCapabilities) => string;
}

/** What the run loading a skill can do, for the parts of a playbook that depend on it. */
export interface SkillCapabilities {
	/** False when `execute_sandboxed_code` is not in the run's tool set, so pandas is not an option. */
	canRunSandbox: boolean;
}

export function listInternalSkills(): InternalSkill[] {
	return [];
}
