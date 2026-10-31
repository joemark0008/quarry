import { useState } from 'react';
import type { StoryViewMode } from '@/feature/stories/components/side-panel/story-viewer.types.ts';

export const useStoryViewerViewMode = () => {
	const [viewMode, setViewMode] = useState<StoryViewMode>('preview');

	return {
		viewMode,
		setViewMode,
	};
};
