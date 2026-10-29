import { storyEnvSchema } from '../config/env.js';

type StoryEnv = ReturnType<typeof storyEnvSchema.parse>;

/**
 * The story flags upstream's module-level code reads from `env`. Parsed from `process.env` on each read (they are
 * cheap), so specs can flip a flag by setting the variable, and the story services stay free of Nest injection.
 */
export const env: StoryEnv = new Proxy({} as StoryEnv, {
	get(_target, property: string) {
		return storyEnvSchema.parse(process.env)[property as keyof StoryEnv];
	},
});
