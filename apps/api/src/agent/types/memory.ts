/** Memory types of upstream `types/memory.ts` the system prompt renders (the `memory` module is Phase 3). */
export const MEMORY_CATEGORIES = ['global_rule', 'personal_fact'] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export interface UserMemory {
	category: MemoryCategory;
	content: string;
}
