import { X } from 'lucide-react';
import { useEffect, useSyncExternalStore } from 'react';

import {
	BLOCK_EDIT_DESCRIPTION,
	CustomStoryBlockEditForm,
	CustomStoryTableFormatForm,
	TABLE_FORMAT_EDIT_DESCRIPTION,
} from './custom-story-block-edit';
import styles from './story-block-edit-panel.module.css';
import { Button } from '@/components/ui/button';
import { useSidePanel } from '@/contexts/side-panel';
import { useChatActivity } from '@/hooks/use-chat-activity';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import { storyBlockEditStore } from '@/stores/story-block-edit';

export function StoryBlockEditPanel({ chatId }: { chatId: string }) {
	const target = useSyncExternalStore(storyBlockEditStore.subscribe, storyBlockEditStore.getSnapshot);
	const { running: isRunning } = useChatActivity(chatId);
	const { isVisible, currentStorySlug } = useSidePanel();
	const isMobile = useIsMobile();
	const isStale =
		target !== null && (target.chatId !== chatId || !isVisible || target.storySlug !== currentStorySlug);

	useEffect(() => {
		if (isRunning || isStale) {
			storyBlockEditStore.close();
		}
	}, [isRunning, isStale]);

	if (!target || isRunning || isStale) {
		return null;
	}

	return (
		<div
			className={cn(
				styles.storyBlockEditPanelDiv,
				isMobile ? styles.storyBlockEditPanelDiv2 : styles.storyBlockEditPanelDiv3,
			)}
			style={isMobile ? undefined : { bottom: 'var(--chat-input-height)' }}
			data-selection-ignore
		>
			<div className={styles.storyBlockEditPanelDiv4}>
				<div className={styles.storyBlockEditPanelDiv5}>
					<div className={styles.storyBlockEditPanelDiv6}>
						{target.kind === 'table' ? 'Edit table formatting' : 'Edit chart'}
					</div>
					<div className={styles.storyBlockEditPanelDiv7}>
						{target.kind === 'table' ? TABLE_FORMAT_EDIT_DESCRIPTION : BLOCK_EDIT_DESCRIPTION}
					</div>
				</div>
				<Button
					variant='ghost'
					size='icon-sm'
					className={styles.storyBlockEditPanelButton}
					onClick={storyBlockEditStore.close}
					aria-label='Close'
				>
					<X className={styles.storyBlockEditPanelX} />
				</Button>
			</div>
			<div className={styles.storyBlockEditPanelDiv8}>
				{target.kind === 'table' ? (
					<CustomStoryTableFormatForm
						key={target.id}
						target={target}
						onCancel={storyBlockEditStore.close}
						onSaved={storyBlockEditStore.close}
					/>
				) : (
					<CustomStoryBlockEditForm
						key={target.id}
						target={target}
						onCancel={storyBlockEditStore.close}
						onSaved={storyBlockEditStore.close}
					/>
				)}
			</div>
		</div>
	);
}
