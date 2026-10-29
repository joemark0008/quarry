import { createHash } from 'node:crypto';

import { Controller, Get, Headers, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';

import type { AuthUser } from '../../auth/auth.service.js';
import { CurrentUser } from '../../common/decorators/current.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { StorySharingService } from './story-sharing.service.js';

/** Port of upstream `routes/story-thumbnail.ts` (`/api/stories`): WebP thumbnails of custom stories. */
@Controller('api/stories')
export class StoryThumbnailController {
	constructor(private readonly sharing: StorySharingService) {}

	@Get(':storyId/thumbnail')
	async getThumbnail(
		@CurrentUser() user: AuthUser,
		@Param('storyId') storyId: string,
		@Query('mode') mode: string | undefined,
		@Headers('if-none-match') ifNoneMatch: string | undefined,
		@Res() response: Response,
	): Promise<void> {
		const thumbnail = await this.sharing.getThumbnail(storyId, user.id, mode);
		if (!thumbnail) {
			response.status(404).setHeader('Cache-Control', 'no-store').json({ error: 'Thumbnail not rendered yet' });
			return;
		}
		const etag = thumbnailEtag(thumbnail.image);
		response.setHeader('Cache-Control', 'private, no-cache').setHeader('ETag', etag);
		if (matchesEtag(ifNoneMatch, etag)) {
			response.status(304).end();
			return;
		}
		response.setHeader('Content-Type', 'image/webp').send(thumbnail.image);
	}
}

/** Port of upstream `routes/embed-story-download.ts` (`/api/embed`): public, authenticated by the embed token. */
@Controller('api/embed')
export class EmbedStoryDownloadController {
	constructor(private readonly sharing: StorySharingService) {}

	@Public()
	@Get('story/:storyId/download')
	async downloadStory(
		@Param('storyId') storyId: string,
		@Query('token') token: string | undefined,
		@Query('format') format: string | undefined,
		@Res() response: Response,
	): Promise<void> {
		const { buffer, filename, mimeType } = await this.sharing.downloadEmbedStory(storyId, token, format);
		const safeName = filename.replace(/[^\x20-\x7E]+/g, '_');
		response
			.setHeader('Content-Type', mimeType)
			.setHeader('Content-Disposition', `attachment; filename="${safeName}"`)
			.send(buffer);
	}
}

function thumbnailEtag(image: Buffer): string {
	return `"${createHash('sha256').update(image).digest('base64url')}"`;
}

function matchesEtag(ifNoneMatch: string | undefined, etag: string): boolean {
	if (!ifNoneMatch) {
		return false;
	}
	return ifNoneMatch
		.split(',')
		.map((tag) => tag.trim().replace(/^W\//, ''))
		.some((tag) => tag === '*' || tag === etag);
}
