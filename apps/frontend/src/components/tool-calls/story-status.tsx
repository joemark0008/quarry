import { useState } from 'react';
import type { UIToolPart } from '@quarry/api/agent/types/chat';
import StoryIcon from '@/components/ui/story-icon';
import { Expandable } from '@/components/ui/expandable';
import { getStoryStatusDisplay } from '@/lib/story-status';
import { useAssistantMessage } from '@/contexts/assistant-message';
import styles from './story-status.module.css';

/** An intermediate story action, superseded by a later one on the same story, shown as a one-line status. */
export const StoryStatus = ({ toolPart }: { toolPart: UIToolPart<'story'> }) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const [isHovering, setIsHovering] = useState(false);
	const { isSettled: isMessageSettled } = useAssistantMessage();
	const { title, version, error, isPending } = getStoryStatusDisplay(toolPart, isMessageSettled);
	const showChevron = !!error && (isHovering || isExpanded);
	const statusIcon = error ? <div className={styles.statusIconDiv} /> : <StoryIcon className={styles.statusIconStoryIcon} />;

	return (
		<div
			onMouseEnter={() => setIsHovering(true)}
			onMouseLeave={() => setIsHovering(false)}
			data-replay-target-id={toolPart.toolCallId}
			{...(error && { 'data-replay-nav': 'tool-error', 'data-replay-bordered': 'false' })}
		>
			<Expandable
				title={title}
				badge={version}
				expanded={isExpanded}
				onExpandedChange={setIsExpanded}
				disabled={!error}
				isLoading={isPending}
				triggerClassName={styles.storyStatusExpandable}
				leadingIcon={showChevron ? undefined : statusIcon}
				variant='inline'
			>
				{error && (
					<pre className={styles.storyStatusPre}>{error}</pre>
				)}
			</Expandable>
		</div>
	);
};
