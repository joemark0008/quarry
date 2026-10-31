import type { ReactNode } from 'react';
import type { ResolvedStory } from '@/hooks/use-mentioned-stories';

import { useOpenStoryInSidePanel } from '@/feature/stories/components/side-panel/open-story-in-side-panel';
import { StoryCard } from '@/feature/stories/components/story-card';
import { useOpenMentionedStory, useResolvedStory } from '@/hooks/use-mentioned-stories';
import styles from './story-reference-card.module.css';

/** An existing story the agent hands over in its answer. */
export function StoryReferenceCard({ storyId, title }: { storyId: string; title: string }) {
	const { data: story, isError } = useResolvedStory(storyId);
	const openStory = useOpenMentionedStory(useOpenStoryInSidePanel());

	return (
		<StoryCard
			title={story?.title ?? title}
			isCustomStory={story?.format === 'custom'}
			storyId={story?.storyId}
			summary={story?.summary}
			canOpen={Boolean(story)}
			onOpen={() => story && openStory(story)}
			status={<span className={styles.storyReferenceCardSpan}>{describeStatus(story, isError)}</span>}
		/>
	);
}

/** A story the agent names in the middle of a sentence. */
export function StoryReferenceLink({ storyId, children }: { storyId: string; children: ReactNode }) {
	const { data: story } = useResolvedStory(storyId);
	const openStory = useOpenMentionedStory(useOpenStoryInSidePanel());

	if (!story) {
		return <>{children}</>;
	}
	return (
		<button
			type='button'
			className={styles.storyReferenceLinkButton}
			onClick={() => openStory(story)}
		>
			{children}
		</button>
	);
}

function describeStatus(story: ResolvedStory | undefined, isError: boolean): string {
	if (isError) {
		return 'Story no longer available';
	}
	if (!story) {
		return 'Loading story…';
	}
	return story.isArchived ? 'Archived story' : 'Existing story';
}
