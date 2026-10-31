import { HistoryIcon } from 'lucide-react';
import styles from './remember-state-header.module.css';
import { Button } from '@/components/ui/button';

export function RememberStateHeader({ onRemember }: { onRemember: () => void }) {
	return (
		<div className={styles.rememberStateHeaderDiv}>
			<span className={styles.rememberStateHeaderSpan}>
				Viewers start this story from scratch on every visit.
			</span>
			<Button variant='outline' size='sm' className={styles.rememberStateHeaderButton} onClick={onRemember}>
				<HistoryIcon className={styles.rememberStateHeaderHistoryIcon} />
				Remember state
			</Button>
		</div>
	);
}

export function rememberStatePrompt(title: string, storySlug: string): string {
	return (
		`Make the custom story "${title}" (id "${storySlug}") remember its state between visits: switch the ` +
		'useState calls holding what a viewer would otherwise redo on every visit to useStoryState, or to ' +
		'useSharedStoryState where everyone should see the same value, keep transient UI in useState, then publish.'
	);
}
