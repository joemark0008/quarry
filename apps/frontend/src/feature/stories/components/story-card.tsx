import { ArrowUpRight } from 'lucide-react';
import { CustomStoryThumbnail } from './custom-story-thumbnail';
import { StoryThumbnail } from './story-thumbnail';
import styles from './story-card.module.css';
import type { ReactNode } from 'react';
import type { StorySummary } from '@quarry/shared/types';
import type { StoryTheme } from '@quarry/shared/story-theme';
import type { QueryDataMap } from './story-embeds';

import { Button } from '@/components/ui/button';

const EMPTY_SUMMARY: StorySummary = { segments: [] };

interface StoryCardProps {
	title: string;
	status: ReactNode;
	isCustomStory: boolean;
	summary?: StorySummary;
	storyId?: string;
	version?: number;
	theme?: StoryTheme | null;
	queryData?: QueryDataMap | null;
	canOpen: boolean;
	onOpen: () => void;
}

/** The card a story takes in a conversation, opening the story on click. */
export function StoryCard({
	title,
	status,
	isCustomStory,
	summary = EMPTY_SUMMARY,
	storyId,
	version,
	theme,
	queryData,
	canOpen,
	onOpen,
}: StoryCardProps) {
	return (
		<button type='button' onClick={onOpen} disabled={!canOpen} className={`${styles.storyCardButton} group`}>
			<div className={styles.storyCardDiv}>
				{isCustomStory ? (
					<CustomStoryThumbnail
						storyId={storyId}
						version={version}
						isToolPart={true}
						summary={summary}
						theme={theme}
						queryData={queryData}
					/>
				) : (
					<StoryThumbnail
						summary={summary}
						className={styles.storyCardStoryThumbnail}
						isToolPart={true}
						theme={theme}
						queryData={queryData}
					/>
				)}
			</div>

			<div className={styles.storyCardDiv2}>
				<span className={styles.storyCardSpan}>{title}</span>
				<div className={styles.storyCardDiv3}>{status}</div>
			</div>

			{canOpen && (
				<Button variant='ghost-muted' size='icon-xs' className={styles.storyCardButton2} asChild>
					<span>
						<ArrowUpRight className={styles.storyCardArrowUpRight} />
					</span>
				</Button>
			)}
		</button>
	);
}
