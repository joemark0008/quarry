/**
 * Stand-in for upstream `services/custom-story-thumbnail.ts`: thumbnails are rendered by headless Chrome
 * (`story-screenshot`), which Phase 4 stage 3 ports. Until then a published version gets no thumbnail.
 */
export function queueCustomStoryThumbnail(_storyId: string, _versionId: string): void {}
