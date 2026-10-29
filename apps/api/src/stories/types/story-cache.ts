export interface StoryQuerySource {
	fingerprint: string;
	databaseId: string | null;
	adminMode: boolean;
}

export type StoryQuerySources = Record<string, StoryQuerySource>;

export type StoryCachedQueryData = Record<string, { data: unknown[]; columns: string[] }>;

/** A `story_data_cache` row with its JSON columns typed (upstream Drizzle's `DBStoryDataCache`). */
export interface StoryDataCacheRow {
	storyId: string;
	queryData: StoryCachedQueryData;
	analysisResults: Record<string, string> | null;
	cachedAt: Date;
	querySources: StoryQuerySources | null;
}
