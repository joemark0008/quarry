import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type { StoryApp } from '@quarry/shared/story-app';

import {
	Prisma,
	type StoryBundle,
	type StoryDraftFile,
	type StoryFile,
	type StoryVersion,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { DbExecutor } from '../../prisma/prisma.types.js';
import { normalizeStoryFilePath } from '../utils/story-file-path.js';
import { insertNextStoryVersion } from './story-sql.js';

export interface StoryFileInput {
	path: string;
	content: string;
}

export type StoryFileWithContent = StoryFile & { content: string };

export const MAX_STORY_FILE_BYTES = 512 * 1024;
export const MAX_STORY_FILES = 60;

export class StoryFileLimitError extends Error {}

export type StoryBundleRow = Omit<StoryBundle, 'thumbnail' | 'thumbnailTheme'>;

export interface VersionThumbnail {
	thumbnail: string;
	renderKey: string | null;
}

interface CutVersionInput {
	storyId: string;
	action: StoryVersion['action'];
	source: StoryVersion['source'];
	versionNumber?: number;
}

/** Port of upstream `queries/story-file.queries.ts`. */
@Injectable()
export class StoryFileRepository {
	constructor(private readonly prisma: PrismaService) {}

	listDraftFiles(storyId: string, executor: DbExecutor = this.prisma): Promise<StoryDraftFile[]> {
		return executor.storyDraftFile.findMany({ where: { storyId }, orderBy: { path: 'asc' } });
	}

	getDraftFile(storyId: string, path: string, executor: DbExecutor = this.prisma): Promise<StoryDraftFile | null> {
		return executor.storyDraftFile.findFirst({ where: { storyId, path: normalizeStoryFilePath(path) } });
	}

	async writeDraftFile(
		storyId: string,
		file: StoryFileInput,
		executor: DbExecutor = this.prisma,
	): Promise<StoryDraftFile> {
		const path = normalizeStoryFilePath(file.path);
		assertFileSize(path, file.content);
		await this.assertFileCount(storyId, path, executor);
		assertNoFolderCollision(
			path,
			(await this.listDraftFiles(storyId, executor)).map((draft) => draft.path),
		);

		return executor.storyDraftFile.upsert({
			where: { storyId_path: { storyId, path } },
			create: { storyId, path, content: file.content },
			update: { content: file.content, updatedAt: new Date() },
		});
	}

	async deleteDraftFile(storyId: string, path: string, executor: DbExecutor = this.prisma): Promise<boolean> {
		const { count } = await executor.storyDraftFile.deleteMany({
			where: { storyId, path: normalizeStoryFilePath(path) },
		});
		return count > 0;
	}

	replaceDraftFiles(
		storyId: string,
		files: StoryFileInput[],
		transaction?: Prisma.TransactionClient,
	): Promise<StoryDraftFile[]> {
		const replace = async (tx: Prisma.TransactionClient) => {
			await tx.storyDraftFile.deleteMany({ where: { storyId } });
			return this.seedDraftFiles(storyId, files, tx);
		};
		return transaction ? replace(transaction) : this.prisma.$transaction(replace);
	}

	async seedDraftFiles(
		storyId: string,
		files: StoryFileInput[],
		executor: DbExecutor = this.prisma,
	): Promise<StoryDraftFile[]> {
		const normalized = normalizeFileSet(files);
		if (normalized.length === 0) {
			return [];
		}
		return executor.storyDraftFile.createManyAndReturn({
			data: normalized.map((file) => ({ storyId, ...file })),
		});
	}

	listVersionFiles(storyVersionId: string, executor: DbExecutor = this.prisma): Promise<StoryFileWithContent[]> {
		return this.listFilesOfVersions([storyVersionId], executor);
	}

	async listFilesOfVersions(
		storyVersionIds: string[],
		executor: DbExecutor = this.prisma,
	): Promise<StoryFileWithContent[]> {
		if (storyVersionIds.length === 0) {
			return [];
		}
		const rows = await executor.storyFile.findMany({
			where: { storyVersionId: { in: storyVersionIds } },
			include: { storyFileBlob: { select: { content: true } } },
			orderBy: { path: 'asc' },
		});
		return rows.map(withContent);
	}

	async getVersionFile(
		storyVersionId: string,
		path: string,
		executor: DbExecutor = this.prisma,
	): Promise<StoryFileWithContent | null> {
		const row = await executor.storyFile.findFirst({
			where: { storyVersionId, path: normalizeStoryFilePath(path) },
			include: { storyFileBlob: { select: { content: true } } },
		});
		return row ? withContent(row) : null;
	}

	/** Runs inside the caller's transaction when given one, so a draft write and its version land together. */
	cutVersionFromDraft(
		data: CutVersionInput,
		transaction?: Prisma.TransactionClient,
	): Promise<{ version: StoryVersion; files: StoryFile[] }> {
		return transaction
			? this.cutVersion(data, transaction)
			: this.prisma.$transaction((tx) => this.cutVersion(data, tx));
	}

	/**
	 * Blobs are shared by content hash, so deleting a story leaves the ones no other version uses behind.
	 * Only blobs older than `createdBefore` go, so a publish still inserting its files never loses a fresh blob.
	 */
	async deleteUnreferencedFileBlobs(createdBefore: Date): Promise<number> {
		const { count } = await this.prisma.storyFileBlob.deleteMany({
			where: { createdAt: { lt: createdBefore }, storyFiles: { none: {} } },
		});
		return count;
	}

	async restoreDraftFromVersion(storyId: string, storyVersionId: string): Promise<StoryDraftFile[]> {
		const files = await this.listVersionFiles(storyVersionId);
		return this.replaceDraftFiles(
			storyId,
			files.map((file) => ({ path: file.path, content: file.content })),
		);
	}

	getVersionBundle(storyVersionId: string): Promise<StoryBundleRow | null> {
		return this.prisma.storyBundle.findUnique({
			where: { storyVersionId },
			omit: { thumbnail: true, thumbnailTheme: true },
		});
	}

	async setVersionBundle(storyVersionId: string, app: StoryApp, executor: DbExecutor = this.prisma): Promise<void> {
		const row = {
			kind: app.kind,
			bundle: app.bundle,
			pageShell: app.kind === 'html' ? app.pageShell : null,
			bundleError: null,
		};
		await executor.storyBundle.upsert({
			where: { storyVersionId },
			create: { storyVersionId, ...row },
			update: { ...row, thumbnail: null, thumbnailTheme: null, builtAt: new Date() },
		});
	}

	async getVersionThumbnail(storyVersionId: string): Promise<VersionThumbnail | null> {
		const row = await this.prisma.storyBundle.findUnique({
			where: { storyVersionId },
			select: { thumbnail: true, thumbnailTheme: true },
		});
		return row?.thumbnail == null ? null : { thumbnail: row.thumbnail, renderKey: row.thumbnailTheme };
	}

	/** Returns false when the version has no bundle row to hold the thumbnail. */
	async setVersionThumbnail(storyVersionId: string, thumbnail: string, renderKey: string | null): Promise<boolean> {
		const { count } = await this.prisma.storyBundle.updateMany({
			where: { storyVersionId },
			data: { thumbnail, thumbnailTheme: renderKey },
		});
		return count > 0;
	}

	private async cutVersion(
		data: CutVersionInput,
		tx: Prisma.TransactionClient,
	): Promise<{ version: StoryVersion; files: StoryFile[] }> {
		const draft = await this.listDraftFiles(data.storyId, tx);
		if (draft.length === 0) {
			throw new StoryFileLimitError('The story has no draft files to publish.');
		}

		await upsertFileBlobs(
			draft.map((file) => file.content),
			tx,
		);

		const version = await insertNextStoryVersion(tx, {
			storyId: data.storyId,
			code: '',
			action: data.action,
			source: data.source,
			versionNumber: data.versionNumber,
		});

		const files = await tx.storyFile.createManyAndReturn({
			data: draft.map((file) => ({
				storyVersionId: version.id,
				path: file.path,
				contentHash: hashContent(file.content),
			})),
		});

		return { version, files };
	}

	private async assertFileCount(storyId: string, path: string, executor: DbExecutor) {
		const count = await executor.storyDraftFile.count({ where: { storyId, path: { not: path } } });
		if (count >= MAX_STORY_FILES) {
			throw new StoryFileLimitError(`A story can hold at most ${MAX_STORY_FILES} files.`);
		}
	}
}

export function storyAppOfBundle(bundle: StoryBundleRow | null): StoryApp | null {
	if (!bundle || bundle.bundle === null) {
		return null;
	}
	if (bundle.kind === 'react') {
		return { kind: 'react', bundle: bundle.bundle };
	}
	return bundle.pageShell === null ? null : { kind: 'html', bundle: bundle.bundle, pageShell: bundle.pageShell };
}

export function hasSameFiles(left: StoryFileInput[], right: StoryFileInput[]): boolean {
	const contents = new Map(right.map((file) => [file.path, file.content]));
	return left.length === right.length && left.every((file) => contents.get(file.path) === file.content);
}

export function hashContent(content: string): string {
	return createHash('sha256').update(content).digest('hex');
}

function withContent({ storyFileBlob, ...file }: StoryFile & { storyFileBlob: { content: string } }) {
	return { ...file, content: storyFileBlob.content };
}

/** Reusing an existing blob refreshes its age, so the cleanup of old unreferenced blobs cannot take it mid-publish. */
async function upsertFileBlobs(contents: string[], executor: DbExecutor): Promise<void> {
	const unique = new Map(contents.map((content) => [hashContent(content), content]));
	if (unique.size === 0) {
		return;
	}
	const now = new Date();
	const values = [...unique.entries()].map(
		([contentHash, content]) =>
			Prisma.sql`(${contentHash}, ${content}, ${Buffer.byteLength(content, 'utf8')}, ${now})`,
	);
	await executor.$executeRaw`
		INSERT INTO story_file_blob (content_hash, content, size, created_at)
		VALUES ${Prisma.join(values)}
		ON CONFLICT (content_hash) DO UPDATE SET created_at = ${now}`;
}

function normalizeFileSet(files: StoryFileInput[]): StoryFileInput[] {
	if (files.length > MAX_STORY_FILES) {
		throw new StoryFileLimitError(`A story can hold at most ${MAX_STORY_FILES} files.`);
	}
	const seen = new Set<string>();
	return files.map((file) => {
		const path = normalizeStoryFilePath(file.path);
		if (seen.has(path)) {
			throw new StoryFileLimitError(`Duplicate file path "${path}".`);
		}
		assertNoFolderCollision(path, [...seen]);
		seen.add(path);
		assertFileSize(path, file.content);
		return { path, content: file.content };
	});
}

function assertFileSize(path: string, content: string) {
	const bytes = Buffer.byteLength(content, 'utf8');
	if (bytes > MAX_STORY_FILE_BYTES) {
		throw new StoryFileLimitError(
			`"${path}" is ${Math.round(bytes / 1024)}KB; files are capped at ${MAX_STORY_FILE_BYTES / 1024}KB.`,
		);
	}
}

function assertNoFolderCollision(path: string, otherPaths: string[]): void {
	const collision = otherPaths.find((other) => other.startsWith(`${path}/`) || path.startsWith(`${other}/`));
	if (collision) {
		throw new StoryFileLimitError(
			`"${path}" cannot sit next to "${collision}": one would be both a file and a folder.`,
		);
	}
}
