import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type { StoryThemePair } from '@quarry/shared/story-theme';
import { DEFAULT_STORY_THEME_PAIR, sameThemePair } from '@quarry/shared/story-theme';
import type { StoryThemeGeneration } from '@quarry/shared/story-theme-generation';
import { parseStoredStoryThemeGeneration } from '@quarry/shared/story-theme-generation';
import { parseStoredStoryThemePair } from '@quarry/shared/story-theme-pair';

import type { ProjectStoryTheme } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface StoryThemeState {
	theme: StoryThemePair | null;
	enabled: boolean;
	createdAt: Date | null;
}

export interface StoryThemeVersion {
	version: number;
	theme: StoryThemePair;
	generation: StoryThemeGeneration | null;
	createdAt: Date;
}

const EMPTY_STATE: StoryThemeState = { theme: null, enabled: false, createdAt: null };

/** Port of upstream `queries/story-theme.queries.ts`. */
@Injectable()
export class StoryThemeRepository {
	constructor(private readonly prisma: PrismaService) {}

	async getStoryThemeState(projectId: string): Promise<StoryThemeState> {
		const row = await this.getLatest(projectId);
		if (!row) {
			return EMPTY_STATE;
		}
		return {
			theme: parseStoredStoryThemePair(row.theme),
			enabled: row.enabled,
			createdAt: row.createdAt,
		};
	}

	async getActiveStoryTheme(projectId: string): Promise<StoryThemePair | null> {
		const state = await this.getStoryThemeState(projectId);
		return state.enabled ? state.theme : null;
	}

	async listStoryThemeVersions(projectId: string): Promise<StoryThemeVersion[]> {
		const rows = await this.prisma.projectStoryTheme.findMany({
			where: { projectId },
			orderBy: { version: 'asc' },
		});
		return rows.flatMap((row) => {
			const theme = parseStoredStoryThemePair(row.theme);
			if (!theme) {
				return [];
			}
			return [
				{
					version: row.version,
					theme,
					generation: parseStoredStoryThemeGeneration(row.generation),
					createdAt: row.createdAt,
				},
			];
		});
	}

	/** A version restored from history keeps the record of what it was generated from. */
	async saveStoryTheme(
		projectId: string,
		theme: StoryThemePair,
		generation: StoryThemeGeneration | null = null,
	): Promise<void> {
		const latest = await this.getLatest(projectId);
		const latestTheme = latest ? parseStoredStoryThemePair(latest.theme) : null;
		if (latestTheme && sameThemePair(latestTheme, theme)) {
			if (latest && !latest.enabled) {
				await this.setStoryThemeEnabled(projectId, true);
			}
			return;
		}

		const generationJson = generation === null ? null : JSON.stringify(generation);
		await this.prisma.$executeRaw`
			INSERT INTO project_story_theme (id, project_id, theme, generation, enabled, version)
			VALUES (
				${randomUUID()},
				${projectId},
				${JSON.stringify(theme)}::jsonb,
				${generationJson}::jsonb,
				true,
				(SELECT coalesce(max(version), 0) + 1 FROM project_story_theme WHERE project_id = ${projectId})
			)
			ON CONFLICT DO NOTHING`;
	}

	async restoreStoryThemeVersion(projectId: string, version: number): Promise<StoryThemePair | null> {
		const versions = await this.listStoryThemeVersions(projectId);
		const match = versions.find((entry) => entry.version === version);
		if (!match) {
			return null;
		}
		await this.saveStoryTheme(projectId, match.theme, match.generation);
		return match.theme;
	}

	async setStoryThemeEnabled(projectId: string, enabled: boolean): Promise<void> {
		const latest = await this.getLatest(projectId);
		if (!latest) {
			if (!enabled) {
				return;
			}
			await this.saveStoryTheme(projectId, DEFAULT_STORY_THEME_PAIR);
			return;
		}
		await this.prisma.projectStoryTheme.updateMany({ where: { id: latest.id }, data: { enabled } });
	}

	private getLatest(projectId: string): Promise<ProjectStoryTheme | null> {
		return this.prisma.projectStoryTheme.findFirst({ where: { projectId }, orderBy: { version: 'desc' } });
	}
}
