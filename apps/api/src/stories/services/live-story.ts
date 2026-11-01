import { createHash } from 'node:crypto';

import { stripSqlFilterBlocks } from '@quarry/shared/sql-template';
import type { StoryNarratives } from '@quarry/shared/story-app';
import { extractQueryIds, TAG_ATTRS } from '@quarry/shared/story-segments';
import type { StoryFormat } from '@quarry/shared/types';
import { generateText, Output } from 'ai';
import { CronExpressionParser } from 'cron-parser';
import { z } from 'zod';

import { MAX_OUTPUT_TOKENS } from '../../agent/agent-manager.js';
import { renderToMarkdown } from '../../agent/markdown/index.js';
import {
	LiveCustomStoryNarrativesPrompt,
	LiveStoryRefreshPrompt,
} from '../../agent/prompts/live-story-refresh-prompt.js';
import { getDefaultModelId } from '../../agent/providers/provider-meta.js';
import { llmTelemetry } from '../../agent/telemetry.js';
import type { QueryResult, ToolContext } from '../../agent/types/tools.js';
import {
	chatQueries,
	executeSqlQueries,
	sharedStoryQueries,
	storyFileQueries,
	storyQueries,
	storyRuntime,
} from '../story-queries.js';
import type { StoryDataCacheRow, StoryQuerySources } from '../types/story-cache.js';
import type { StoryNarrativeSource } from '../utils/story-kit-narratives.js';
import { extractStoryNarratives } from '../utils/story-kit-narratives.js';
import {
	backfillMissingQueryData,
	extractCustomStoryQueryIds,
	findMissingQueryIds,
} from '../utils/story-query-data.js';

/** quarry: billing is not ported, so every project may run story queries (upstream `assertProjectCloudBillingAccess`). */
async function assertProjectCloudBillingAccess(_projectId: string): Promise<void> {}

/** quarry: upstream gated this on the enterprise license; `exclude_columns` is enforced whenever configured. */
async function resolveExcludedColumnEnforcement(..._args: unknown[]): Promise<boolean> {
	return true;
}

function getQueryDataFromCode(chatId: string, code: string) {
	return sharedStoryQueries.getQueryDataFromCode(chatId, code);
}

const MAX_RENDERED_ROWS = 60;

interface StoryRefreshTarget {
	projectId: string;
	userId: string;
	chatId: string;
}

export type StorySqlQuery = { sqlQuery: string; databaseId?: string; adminMode: boolean };
export type StorySqlQueries = Record<string, StorySqlQuery>;
export type StoryQueryData = Record<string, { data: unknown[]; columns: string[] }>;

export async function executeLiveQuery(
	chatId: string,
	queryId: string,
	options: StoryRefreshOptions = {},
): Promise<{ data: unknown[]; columns: string[] }> {
	const query = await storyQueries.getSqlQueryById(chatId, queryId);
	if (!query) {
		throw new Error(`Query ${queryId} not found in chat ${chatId}`);
	}

	const queryData = await executeStoryQueries(
		chatId,
		{ [queryId]: query },
		{ renderSql: stripSqlFilterBlocks, billingAccessVerifiedProjectId: options.billingAccessVerifiedProjectId },
	);
	return queryData[queryId]!;
}

export interface RefreshResult {
	queryData: StoryQueryData;
	narratives: StoryNarratives;
}

interface StoryRefreshOptions {
	billingAccessVerifiedProjectId?: string;
}

export async function refreshStoryData(
	chatId: string,
	slug: string,
	options: StoryRefreshOptions = {},
): Promise<RefreshResult> {
	const { queryData, narratives } = await refreshStoryDataWithContext(chatId, slug, undefined, options);
	return { queryData, narratives };
}

async function refreshStoryDataWithContext(
	chatId: string,
	slug: string,
	existingExecutionContext?: StoryExecutionContext,
	options: StoryRefreshOptions = {},
): Promise<RefreshResult & { code: string }> {
	const version = await storyQueries.getLatestVersionByChatAndSlug(chatId, slug);
	if (!version) {
		throw new Error('Story not found');
	}

	const sqlQueries = await getVersionSqlQueries(chatId, version);
	if (Object.keys(sqlQueries).length === 0) {
		return { queryData: {}, code: version.code, narratives: {} };
	}

	const chat = await chatQueries.getChatInfo(chatId);
	if (!chat) {
		throw new Error('Chat project not found');
	}

	const queryData = await executeStoryQueries(chatId, sqlQueries, {
		renderSql: stripSqlFilterBlocks,
		executionContext: existingExecutionContext,
		projectId: chat.projectId,
		billingAccessVerifiedProjectId: options.billingAccessVerifiedProjectId,
	});

	let refreshedCode = version.code;
	const target = { projectId: chat.projectId, userId: chat.userId, chatId };
	if (version.isLiveTextDynamic && version.format === 'classic') {
		const newCode = await generateDynamicStoryCode(target, version.title, version.code, queryData);
		if (newCode) {
			await storyQueries.updateLatestVersionCode(chatId, slug, newCode);
			refreshedCode = newCode;
		}
	}

	const narratives =
		version.isLiveTextDynamic && version.format === 'custom'
			? await regenerateCustomStoryNarratives(target, version, queryData)
			: {};
	await storyQueries.upsertStoryDataCache(chatId, slug, queryData, buildQuerySources(sqlQueries), narratives);

	return { queryData, code: refreshedCode, narratives };
}

async function getVersionSqlQueries(
	chatId: string,
	version: { id: string; code: string; format: StoryFormat | string },
): Promise<Record<string, { sqlQuery: string; databaseId?: string; adminMode: boolean }>> {
	if (version.format === 'classic') {
		return storyQueries.getSqlQueriesFromCode(chatId, version.code);
	}
	const queryIds = extractCustomStoryQueryIds(await storyFileQueries.listVersionFiles(version.id));
	return queryIds.size > 0 ? executeSqlQueries.getLatestSqlQueriesByIds(chatId, queryIds) : {};
}

export interface StoryQueryDataResult {
	queryData: Record<string, { data: unknown[]; columns: string[] }> | null;
	cachedAt: Date | null;
	code: string;
	allowsPersistedFallback?: boolean;
	needsRefresh?: boolean;
}

interface StoryQueryDataOptions {
	/** Return the stored data right away and leave the refresh to the caller, instead of refreshing inline. */
	deferRefresh?: boolean;
	/** Same, but only for a story that was never cached, so going live does not block on its first refresh. */
	deferFirstRefresh?: boolean;
}

export async function getStoryQueryData(
	chatId: string,
	slug: string,
	code: string,
	isLive: boolean,
	cacheSchedule: string | null,
	options: StoryQueryDataOptions = {},
): Promise<StoryQueryDataResult> {
	if (!isLive) {
		return {
			queryData: await getQueryDataFromCode(chatId, code),
			cachedAt: null,
			code,
			allowsPersistedFallback: true,
		};
	}
	const cache = await storyQueries.getStoryDataCacheByChatAndSlug(chatId, slug);

	if (cache && !isCacheExpired(cache.cachedAt, cacheSchedule)) {
		return resolveLegacyCache(chatId, code, cache);
	}

	if (shouldDeferRefresh(options, cache, code)) {
		return { ...(await resolveStoredQueryData(chatId, code, cache)), needsRefresh: true };
	}

	try {
		const { queryData, code: refreshedCode } = await refreshStoryDataWithContext(chatId, slug);
		return {
			queryData: Object.keys(queryData).length > 0 ? queryData : null,
			cachedAt: new Date(),
			code: refreshedCode,
		};
	} catch {
		return resolveStoredQueryData(chatId, code, cache);
	}
}

function shouldDeferRefresh(options: StoryQueryDataOptions, cache: StoryDataCacheRow | null, code: string): boolean {
	const isDeferred = options.deferRefresh || (options.deferFirstRefresh && cache === null);
	return Boolean(isDeferred) && extractQueryIds(code).size > 0;
}

async function resolveStoredQueryData(
	chatId: string,
	code: string,
	cache: StoryDataCacheRow | null,
): Promise<StoryQueryDataResult> {
	if (cache) {
		return resolveLegacyCache(chatId, code, cache);
	}
	return {
		queryData: await getQueryDataFromCode(chatId, code),
		cachedAt: null,
		code,
	};
}

async function resolveLegacyCache(
	chatId: string,
	code: string,
	cache: StoryDataCacheRow,
): Promise<StoryQueryDataResult> {
	const missing = findMissingQueryIds(code, cache.queryData);
	const queryData =
		missing.length > 0 ? await backfillMissingQueryData(code, cache.queryData, { chatId }) : cache.queryData;
	return { queryData, cachedAt: cache.cachedAt, code };
}

function buildQuerySources(sqlQueries: StorySqlQueries): StoryQuerySources {
	return Object.fromEntries(
		Object.entries(sqlQueries).map(([queryId, query]) => {
			const databaseId = query.databaseId ?? null;
			const normalizedSql = normalizeEffectiveSql(query.sqlQuery);
			const canonicalSource = JSON.stringify({
				sql: normalizedSql,
				databaseId,
				adminMode: query.adminMode,
			});
			return [
				queryId,
				{
					fingerprint: createHash('sha256').update(canonicalSource).digest('hex'),
					databaseId,
					adminMode: query.adminMode,
				},
			];
		}),
	);
}

function normalizeEffectiveSql(sql: string): string {
	return stripSqlFilterBlocks(sql).replaceAll('\r\n', '\n').trim();
}

export interface StoryExecutionContext {
	toolContext: ToolContext;
	enforceExcludedColumns: boolean;
}

interface StoryQueryExecutionOptions {
	renderSql: (sqlQuery: string) => string;
	executionContext?: StoryExecutionContext;
	projectId?: string;
	billingAccessVerifiedProjectId?: string;
}

/**
 * Runs the story's queries where each one belongs: the app database or the warehouse.
 */
export async function executeStoryQueries(
	chatId: string,
	sqlQueries: StorySqlQueries,
	options: StoryQueryExecutionOptions,
): Promise<StoryQueryData> {
	const projectId =
		options.executionContext?.toolContext.projectId ?? options.projectId ?? (await requireChatProjectId(chatId));
	if (options.billingAccessVerifiedProjectId !== projectId) {
		await assertProjectCloudBillingAccess(projectId);
	}
	const queries = Object.entries(sqlQueries);
	const executionContext = queries.some(([, query]) => !query.adminMode)
		? (options.executionContext ?? (await createStoryExecutionContext(chatId)))
		: null;

	const execute = async (query: StorySqlQuery): Promise<QueryResult> => {
		const sql = options.renderSql(query.sqlQuery);
		if (query.adminMode) {
			return executeAppDatabaseSql(projectId, sql);
		}
		if (!executionContext) {
			throw new Error('Live Story warehouse query has no execution context.');
		}
		return executeBillingValidatedRawSql(sql, { executionContext, databaseId: query.databaseId });
	};

	const entries = await Promise.all(
		queries.map(async ([queryId, query]) => [queryId, await execute(query)] as const),
	);
	return Object.fromEntries(entries);
}

interface RawSqlExecutionOptions {
	executionContext: StoryExecutionContext;
	databaseId?: string;
	billingAccessVerifiedProjectId?: string;
}

export async function executeRawSql(sqlQuery: string, options: RawSqlExecutionOptions): Promise<QueryResult> {
	const projectId = options.executionContext.toolContext.projectId;
	if (options.billingAccessVerifiedProjectId !== projectId) {
		await assertProjectCloudBillingAccess(projectId);
	}
	return executeBillingValidatedRawSql(sqlQuery, options);
}

async function executeBillingValidatedRawSql(sqlQuery: string, options: RawSqlExecutionOptions): Promise<QueryResult> {
	const context = options.executionContext.toolContext;
	const data = await context.services.executeWarehouseSql(sqlQuery, {
		projectFolder: context.projectFolder,
		databaseId: options.databaseId,
		envVars: context.envVars,
		azureAccessToken: context.azureAccessToken,
		enforceExcludedColumns: options.executionContext.enforceExcludedColumns,
		tableAccess: context.warehouseTableAccess,
		rowSecurity: context.warehouseRowSecurity ?? { enforced: false },
	});
	return { data: data.data, columns: data.columns };
}

export async function createStoryExecutionContext(chatId: string): Promise<StoryExecutionContext> {
	const [projectId, ownerId] = await Promise.all([requireChatProjectId(chatId), chatQueries.getChatOwnerId(chatId)]);
	if (!ownerId) {
		throw new Error('Chat owner not found');
	}
	const toolContext = await storyRuntime.buildToolContext({ projectId, userId: ownerId, chatId });
	return {
		toolContext,
		enforceExcludedColumns: await resolveExcludedColumnEnforcement(projectId, toolContext.agentSettings),
	};
}

async function requireChatProjectId(chatId: string): Promise<string> {
	const projectId = await chatQueries.getChatProjectId(chatId);
	if (!projectId) {
		throw new Error('Chat project not found');
	}
	return projectId;
}

async function executeAppDatabaseSql(projectId: string, sqlQuery: string): Promise<QueryResult> {
	const { columns, rows } = await storyRuntime.runScopedAppDbQuery(projectId, sqlQuery);
	return { data: rows, columns };
}

export function isCacheExpired(cachedAt: Date, cacheSchedule: string | null): boolean {
	if (!cacheSchedule) {
		return false;
	}

	try {
		const interval = CronExpressionParser.parse(cacheSchedule, { currentDate: new Date() });
		const prevScheduledTime = interval.prev().toDate();
		return cachedAt.getTime() < prevScheduledTime.getTime();
	} catch {
		return false;
	}
}

async function generateDynamicStoryCode(
	target: StoryRefreshTarget,
	title: string,
	originalCode: string,
	queryData: Record<string, { data: unknown[]; columns: string[] }>,
): Promise<string | null> {
	const liveStoryModel = await resolveLiveStoryModel(target);
	if (!liveStoryModel) {
		return null;
	}

	try {
		const querySummaries = buildQueryDataSummary(queryData);
		const systemPrompt = renderToMarkdown(LiveStoryRefreshPrompt({ title, originalCode, querySummaries }));

		const output = await generateLiveStoryOutput(
			target,
			liveStoryModel,
			systemPrompt,
			'Refresh the story narrative with the latest query results.',
			z.object({ code: z.string().min(1) }),
		);

		const candidate = stripCodeFence(output.code.trim());
		if (!candidate || !preservesStoryStructure(originalCode, candidate)) {
			return null;
		}

		return candidate;
	} catch (error) {
		throw error instanceof Error ? error : new Error(String(error));
	}
}

/** Narratives are rewritten from the text in the published source, never from a previous refresh, so they cannot drift. */
async function regenerateCustomStoryNarratives(
	target: StoryRefreshTarget,
	version: { id: string; title: string },
	queryData: Record<string, { data: unknown[]; columns: string[] }>,
): Promise<StoryNarratives> {
	const sources = extractStoryNarratives(await storyFileQueries.listVersionFiles(version.id));
	if (sources.length === 0) {
		return {};
	}
	const liveStoryModel = await resolveLiveStoryModel(target);
	if (!liveStoryModel) {
		return {};
	}

	const systemPrompt = renderToMarkdown(
		LiveCustomStoryNarrativesPrompt({
			title: version.title,
			narratives: sources,
			querySummaries: buildQueryDataSummary(queryData),
		}),
	);
	const output = await generateLiveStoryOutput(
		target,
		liveStoryModel,
		systemPrompt,
		'Rewrite every narrative with the latest query results.',
		z.object({ narratives: z.array(z.object({ id: z.string(), text: z.string() })) }),
	);
	return keepKnownNarratives(sources, output.narratives);
}

function keepKnownNarratives(sources: StoryNarrativeSource[], rewritten: StoryNarrativeSource[]): StoryNarratives {
	const knownIds = new Set(sources.map((source) => source.id));
	const narratives: StoryNarratives = {};
	for (const { id, text } of rewritten) {
		const trimmed = text.trim();
		if (knownIds.has(id) && trimmed) {
			narratives[id] = trimmed;
		}
	}
	return narratives;
}

type LiveStoryModel = NonNullable<Awaited<ReturnType<typeof resolveLiveStoryModel>>>;

async function resolveLiveStoryModel(target: StoryRefreshTarget) {
	const pinned = await storyRuntime.llm.resolveDefaultModelSelection(target.projectId, 'live_story');
	const provider = pinned?.provider ?? (await storyRuntime.llm.getProjectModelProvider(target.projectId));
	if (!provider) {
		return null;
	}

	const modelId = pinned?.modelId ?? getDefaultModelId(provider);
	const model = await storyRuntime.llm.resolveProviderModel(target.projectId, provider, modelId, true);
	return model ? { provider, model } : null;
}

async function generateLiveStoryOutput<T>(
	target: StoryRefreshTarget,
	{ provider, model }: LiveStoryModel,
	systemPrompt: string,
	instruction: string,
	schema: z.ZodType<T>,
): Promise<T> {
	const { output } = await generateText({
		...model,
		system: systemPrompt,
		messages: [{ role: 'user', content: instruction }],
		output: Output.object({ schema }),
		maxOutputTokens: MAX_OUTPUT_TOKENS,
		experimental_telemetry: llmTelemetry('quarry-live-story', { projectId: target.projectId, tags: [provider] }),
	});

	// quarry: usage tracking (`llm_inference` records) is not ported; upstream saved one here.

	return output;
}

function buildQueryDataSummary(queryData: Record<string, { data: unknown[]; columns: string[] }>) {
	return Object.entries(queryData).map(([queryId, result]) => {
		const rows = result.data.filter((row): row is Record<string, unknown> => isRecord(row));
		const rowsForModel = rows.length <= MAX_RENDERED_ROWS ? rows : rows.slice(0, MAX_RENDERED_ROWS);

		return {
			queryId,
			columns: result.columns,
			rowCount: rows.length,
			rows: rowsForModel,
			truncated: rowsForModel.length !== rows.length,
			numericSummaries: buildNumericSummaries(rows, result.columns),
		};
	});
}

function buildNumericSummaries(rows: Record<string, unknown>[], columns: string[]) {
	const summaries: Record<string, { min: number; max: number; avg: number; sum: number; count: number }> = {};

	for (const column of columns) {
		const values = rows
			.map((row) => toFiniteNumber(row[column]))
			.filter((value): value is number => value !== null);

		if (!values.length) {
			continue;
		}

		let min = Infinity;
		let max = -Infinity;
		let sum = 0;
		for (const v of values) {
			if (v < min) {
				min = v;
			}
			if (v > max) {
				max = v;
			}
			sum += v;
		}
		summaries[column] = {
			min,
			max,
			avg: sum / values.length,
			sum,
			count: values.length,
		};
	}

	return summaries;
}

function toFiniteNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === 'string') {
		const normalized = value.replaceAll(',', '').trim();
		if (!normalized) {
			return null;
		}

		const parsed = Number(normalized);
		return Number.isFinite(parsed) ? parsed : null;
	}

	return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stripCodeFence(value: string): string {
	return value
		.replace(/^```(?:markdown)?\s*/i, '')
		.replace(/\s*```$/, '')
		.trim();
}

function preservesStoryStructure(originalCode: string, candidateCode: string): boolean {
	return (
		JSON.stringify(extractStructureTokens(originalCode)) ===
			JSON.stringify(extractStructureTokens(candidateCode)) &&
		JSON.stringify(extractHeadingTokens(originalCode)) === JSON.stringify(extractHeadingTokens(candidateCode))
	);
}

function extractStructureTokens(code: string): string[] {
	const tokenRegex = new RegExp(
		String.raw`<grid\s+${TAG_ATTRS}>|<\/grid>|<chart\s+${TAG_ATTRS}\/?>|<table\s+${TAG_ATTRS}\/?>|<filter\s+${TAG_ATTRS}\/?>`,
		'g',
	);
	return code.match(tokenRegex) ?? [];
}

function extractHeadingTokens(code: string): string[] {
	return code
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => /^#{1,6}\s+\S/.test(line));
}
