import { cn } from '@/lib/utils';
import styles from './empty.module.css';

interface EmptyProps {
	children: React.ReactNode;
	className?: string;
}

export function Empty({ children, className }: EmptyProps) {
	return (
		<div className={cn(styles.emptyDiv, className)}>{children}</div>
	);
}
