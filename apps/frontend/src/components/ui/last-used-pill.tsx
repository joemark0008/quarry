import { cn } from '@/lib/utils';
import styles from './last-used-pill.module.css';

export function LastUsedPill({ className }: { className?: string }) {
	return (
		<span
			className={cn(
				styles.lastUsedPillSpan,
				styles.lastUsedPillSpan2,
				className,
			)}
		>
			Last used
		</span>
	);
}
