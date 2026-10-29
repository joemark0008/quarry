import { z } from 'zod/v4';

import { HandlerError } from '../../common/errors/handler-error.js';
import {
	CustomStoryFileNotFoundError,
	CustomStoryNotFoundError,
	CustomStoryQueryExecutionError,
	CustomStoryQueryNotAllowedError,
	CustomStoryQueryNotFoundError,
} from '../services/custom-story.js';
import { InvalidStoryStateError } from '../services/custom-story-state.js';
import { InvalidStoryFilePathError } from './story-file-path.js';

/** Upstream `utils/story-snapshot` (stage 3 ports the rest of the snapshot code). */
export const MAX_STORY_SNAPSHOT_BYTES = 24 * 1024 * 1024;

export const storySnapshotHtml = z
	.string()
	.min(1)
	.refine((html) => Buffer.byteLength(html, 'utf8') <= MAX_STORY_SNAPSHOT_BYTES, {
		message: `The story snapshot exceeds ${MAX_STORY_SNAPSHOT_BYTES / 1024 / 1024} MB.`,
	});

export const storyStateChange = z.object({
	key: z.string(),
	value: z.unknown(),
	shared: z.boolean(),
});

export function toCustomStoryTrpcError(error: unknown): unknown {
	if (
		error instanceof CustomStoryNotFoundError ||
		error instanceof CustomStoryFileNotFoundError ||
		error instanceof CustomStoryQueryNotFoundError
	) {
		return new HandlerError('NOT_FOUND', error.message);
	}
	if (error instanceof InvalidStoryFilePathError || error instanceof InvalidStoryStateError) {
		return new HandlerError('BAD_REQUEST', error.message);
	}
	if (error instanceof CustomStoryQueryNotAllowedError) {
		return new HandlerError('FORBIDDEN', error.message);
	}
	return error;
}

/**
 * Upstream `utils/custom-story-errors.ts`: tRPC errors become `HandlerError`s (GraphQL `extensions.code`).
 * A failing query is the story's content, not a server fault: its message reaches the frame instead of a masked 500. */
export function toCustomStoryQueryTrpcError(error: unknown): unknown {
	if (error instanceof CustomStoryQueryExecutionError) {
		return new HandlerError('BAD_REQUEST', error.message);
	}
	return toCustomStoryTrpcError(error);
}
