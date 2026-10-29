import type { UserRepository } from '../../users/user.repository.js';
import type { FavoriteRepository } from '../repositories/favorite.repository.js';
import * as favoriteModule from '../repositories/favorite.repository.js';
import type { StoryNotificationRepository } from './story-notification.repository.js';

/**
 * The upstream query namespaces the story jobs, favorites and story feedback import (`favorite.queries`,
 * `user.queries`, `notification.queries`, the story half of `feedback.queries`), bound at boot by
 * `StoryJobsModule` / `StoryFavoritesModule` / `StoryFeedbackModule` the way `story-queries.ts` binds the story
 * repositories. Specs bind fakes with `bindStoryJobQueries`.
 */
export interface StoryFeedbackQueries {
	upsertStoryFeedback(feedback: {
		storyId: string;
		userId: string;
		vote: string;
		explanation: string | null;
	}): Promise<unknown>;
	getUserStoryFeedback(storyId: string, userId: string): Promise<unknown>;
}

export interface StoryJobQueryRepositories {
	favorite: FavoriteRepository;
	feedback: StoryFeedbackQueries;
	user: UserRepository;
	notification: StoryNotificationRepository;
}

type Bound = { [K in keyof StoryJobQueryRepositories]?: Partial<StoryJobQueryRepositories[K]> };

let repositories: Bound = {};

/** Adds or replaces bindings (`null` unbinds everything); partial objects are fine in specs. */
export function bindStoryJobQueries(bound: Bound | null): void {
	repositories = bound === null ? {} : { ...repositories, ...bound };
}

/** Removes some bindings, keeping the others (each module unbinds its own on shutdown). */
export function unbindStoryJobQueries(...keys: (keyof StoryJobQueryRepositories)[]): void {
	repositories = { ...repositories };
	for (const key of keys) {
		delete repositories[key];
	}
}

function namespace<K extends keyof StoryJobQueryRepositories, M extends object>(
	key: K,
	statics: M,
): StoryJobQueryRepositories[K] & M {
	return new Proxy({} as StoryJobQueryRepositories[K] & M, {
		get(_target, property) {
			if (typeof property === 'string' && property in statics) {
				return (statics as Record<string, unknown>)[property];
			}
			return (...args: unknown[]) => {
				const repository = repositories[key] as Record<string | symbol, unknown> | undefined;
				if (!repository) {
					throw new Error(`The ${key} repository is not bound for the story jobs.`);
				}
				const method = repository[property];
				if (typeof method !== 'function') {
					throw new Error(`The ${key} repository has no method ${String(property)}.`);
				}
				return method.apply(repository, args);
			};
		},
	});
}

export const favoriteQueries = namespace('favorite', favoriteModule);
export const feedbackQueries = namespace('feedback', {});
export const userQueries = namespace('user', {});
export const notificationQueries = namespace('notification', {});
