import type { LlmService } from '../agent/llm/llm.service.js';
import type { ToolContext } from '../agent/types/tools.js';
import type { ChartRepository } from '../charts/chart.repository.js';
import type { ChatRepository } from '../chats/chat.repository.js';
import * as chatModule from '../chats/chat.repository.js';
import type { SharedChatRepository } from '../chats/shared-chat.repository.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { ProjectRepository } from '../projects/project.repository.js';
import type { McpEmbedRepository } from './repositories/mcp-embed.repository.js';
import type { SharedStoryRepository } from './repositories/shared-story.repository.js';
import * as sharedStoryModule from './repositories/shared-story.repository.js';
import type { StoryRepository } from './repositories/story.repository.js';
import * as storyModule from './repositories/story.repository.js';
import type { StoryAppStateRepository } from './repositories/story-app-state.repository.js';
import * as storyAppStateModule from './repositories/story-app-state.repository.js';
import type { StoryDeliveryRepository } from './repositories/story-delivery.repository.js';
import * as storyDeliveryModule from './repositories/story-delivery.repository.js';
import type { StoryFileRepository } from './repositories/story-file.repository.js';
import * as storyFileModule from './repositories/story-file.repository.js';
import type { StoryFolderRepository } from './repositories/story-folder.repository.js';
import * as storyFolderModule from './repositories/story-folder.repository.js';
import type { StoryReferenceRepository } from './repositories/story-reference.repository.js';
import * as storyReferenceModule from './repositories/story-reference.repository.js';
import type { StoryThemeRepository } from './repositories/story-theme.repository.js';
import * as storyThemeModule from './repositories/story-theme.repository.js';

/**
 * The query namespaces upstream's module-level story services import (`import * as storyQueries from
 * '../queries/story.queries'`). The services, the `story` tool and the story mounts are copied module-level code,
 * so `StoriesCoreModule` binds the repositories here at boot (the context explorer does the same); each namespace
 * exposes the repository's methods plus the module's own exports (constants, error classes, pure helpers), under
 * upstream's names. Specs bind fakes with `bindStoryQueries`, the way upstream mocks its query files.
 */
export interface StoryQueryRepositories {
	story: StoryRepository;
	storyFile: StoryFileRepository;
	storyFolder: StoryFolderRepository;
	storyTheme: StoryThemeRepository;
	storyReference: StoryReferenceRepository;
	sharedStory: SharedStoryRepository;
	storyDelivery: StoryDeliveryRepository;
	storyAppState: StoryAppStateRepository;
	mcpEmbed: McpEmbedRepository;
	chart: ChartRepository;
	chat: ChatRepository;
	sharedChat: SharedChatRepository;
	project: ProjectRepository;
}

type Bound = { [K in keyof StoryQueryRepositories]?: Partial<StoryQueryRepositories[K]> };

let repositories: Bound = {};

/** Binds (or, with `null`, unbinds) every repository; partial objects are fine in specs. */
export function bindStoryQueries(bound: Bound | null): void {
	repositories = bound ?? {};
}

/** Adds or replaces some bindings, keeping the others. */
export function patchStoryQueries(bound: Bound): void {
	repositories = { ...repositories, ...bound };
}

function namespace<K extends keyof StoryQueryRepositories, M extends object>(
	key: K,
	statics: M,
): StoryQueryRepositories[K] & M {
	return new Proxy({} as StoryQueryRepositories[K] & M, {
		get(_target, property) {
			if (typeof property === 'string' && property in statics) {
				return (statics as Record<string, unknown>)[property];
			}
			// Resolved at call time, so a namespace method can be captured before the repositories are bound.
			return (...args: unknown[]) => {
				const repository = repositories[key] as Record<string | symbol, unknown> | undefined;
				if (!repository) {
					throw new Error(`The ${key} repository is not bound (StoriesCoreModule binds it at boot).`);
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

export const storyQueries = namespace('story', storyModule);
export const storyFileQueries = namespace('storyFile', storyFileModule);
export const storyFolderQueries = namespace('storyFolder', storyFolderModule);
export const storyThemeQueries = namespace('storyTheme', storyThemeModule);
export const storyReferenceQueries = namespace('storyReference', storyReferenceModule);
export const sharedStoryQueries = namespace('sharedStory', sharedStoryModule);
export const storyDeliveryQueries = namespace('storyDelivery', storyDeliveryModule);
export const storyAppStateQueries = namespace('storyAppState', storyAppStateModule);
/** Upstream `chat.queries` and `execute-sql.queries`, both on `ChatRepository`. */
export const chatQueries = namespace('chat', chatModule);
export const executeSqlQueries = chatQueries;
export const projectQueries = namespace('project', {});
export const sharedChatQueries = namespace('sharedChat', {});
/** Upstream `queries/chart-image` (`getDisplayChartTableFormatsForChat`), on `ChartRepository`. */
export const chartQueries = namespace('chart', {});
/** Upstream `mcp-query-data.queries` (`getMcpQueryData`), on `McpEmbedRepository`. */
export const mcpQueryDataQueries = namespace('mcpEmbed', {});
/** The one `activity.queries` read stories need (`getLatestStoryRefreshFailure`), on `StoryRepository`. */
export const activityQueries = storyQueries;
/** The one `analytics-event.queries` read stories need (`listMostViewedStoryIds`), on `StoryReferenceRepository`. */
export const analyticsEventQueries = storyReferenceQueries;

/** Upstream `db.transaction`, run by the story file repository (Prisma stays inside repositories). */
export const db = {
	transaction<T>(run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
		return storyFileQueries.transaction(run);
	},
};

export type DBTransaction = Prisma.TransactionClient;

/**
 * Services of other modules upstream's story code imported as functions (`buildToolContext`, `queryAppDb`, the
 * `utils/llm` helpers). `StoriesModule` binds them at boot.
 */
export interface StoryRuntime {
	/** Upstream `services/agent` `buildToolContext` (project agent settings included). */
	buildToolContext(opts: { projectId: string; userId: string; chatId: string }): Promise<ToolContext>;
	/** Upstream `queryAppDb`: read-only SQL over the project-scoped app-database views. */
	runScopedAppDbQuery(
		projectId: string,
		sql: string,
	): Promise<{ columns: string[]; rows: Record<string, unknown>[] }>;
	/** Upstream `agentService.get(chatId)`: whether an agent run is going on in the chat. */
	isAgentRunning(chatId: string): boolean;
	llm: Pick<LlmService, 'resolveDefaultModelSelection' | 'resolveProviderModel' | 'getProjectModelProvider'>;
}

let runtime: Partial<StoryRuntime> = {};

export function bindStoryRuntime(bound: Partial<StoryRuntime> | null): void {
	runtime = bound ?? {};
}

export const storyRuntime: StoryRuntime = new Proxy({} as StoryRuntime, {
	get(_target, property: keyof StoryRuntime) {
		const value = runtime[property];
		if (!value) {
			throw new Error(`The story runtime's ${String(property)} is not bound (StoriesModule binds it at boot).`);
		}
		return value;
	},
});
