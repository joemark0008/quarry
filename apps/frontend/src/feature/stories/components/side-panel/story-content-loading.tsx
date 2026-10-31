import styles from './story-content-loading.module.css';
import QuarryLogoAnimated from '@/components/icons/quarry-logo-animated';

export function StoryContentLoading() {
	return (
		<div className={styles.storyContentLoadingDiv}>
			<div className={styles.storyContentLoadingDiv2}>
				<QuarryLogoAnimated height={16} width={16} durationSeconds={2.2} title='' />
				<span className={styles.storyContentLoadingSpan}>Loading story content...</span>
			</div>
		</div>
	);
}
