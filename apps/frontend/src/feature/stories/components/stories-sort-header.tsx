import { ChevronDown } from 'lucide-react';
import type { SortField, SortState } from '@/lib/stories-page';
import { defaultSortDirection } from '@/lib/stories-page';
import { cn } from '@/lib/utils';
import styles from './stories-sort-header.module.css';

export function SortHeader({ value, onChange }: { value: SortState; onChange: (next: SortState) => void }) {
	return (
		<div className={styles.sortHeaderDiv}>
			<div className={styles.sortHeaderDiv2}>
				<SortPill label='Name' field='name' value={value} onChange={onChange} />
			</div>
			<div className={styles.sortHeaderDiv3}>
				<SortPill label='Owner' field='owner' value={value} onChange={onChange} />
			</div>
			<div className={styles.sortHeaderDiv4}>
				<SortPill label='Views' field='views' value={value} onChange={onChange} />
			</div>
			<div className={styles.sortHeaderDiv5}>
				<SortPill label='Updated' field='updated' value={value} onChange={onChange} />
			</div>
			<div className={styles.sortHeaderDiv6} />
		</div>
	);
}

function SortPill({
	label,
	field,
	value,
	onChange,
}: {
	label: string;
	field: SortField;
	value: SortState;
	onChange: (next: SortState) => void;
}) {
	const isActive = value.field === field;
	const showsAscending = isActive ? value.direction === 'asc' : defaultSortDirection(field) === 'asc';

	function handleClick() {
		if (!isActive) {
			onChange({ field, direction: defaultSortDirection(field) });
		} else {
			onChange({ field, direction: value.direction === 'desc' ? 'asc' : 'desc' });
		}
	}

	return (
		<button
			type='button'
			onClick={handleClick}
			className={cn(
				styles.sortPillButton,
				isActive ? styles.sortPillButton2 : styles.sortPillButton3,
			)}
		>
			<span>{label}</span>
			<ChevronDown size={12} className={cn(styles.sortPillChevronDown, showsAscending && styles.sortPillChevronDown2)} />
		</button>
	);
}
