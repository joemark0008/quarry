import styles from './story-embed-fallback.module.css';
import type { ReactNode } from 'react';

export function StoryEmbedFallback({
	dragHandle,
	dragHandlePlacement = 'trailing',
	children,
}: {
	dragHandle?: ReactNode;
	dragHandlePlacement?: 'leading' | 'trailing';
	children: ReactNode;
}) {
	return (
		<div className={styles.storyEmbedFallbackDiv}>
			{dragHandle != null && (
				<div
					className={`${styles.storyEmbedFallbackDiv2} ${dragHandlePlacement === 'leading' ? styles.state100 : styles.state101}`}
				>
					{dragHandle}
				</div>
			)}
			<div className={styles.storyEmbedFallbackDiv3}>{children}</div>
		</div>
	);
}
