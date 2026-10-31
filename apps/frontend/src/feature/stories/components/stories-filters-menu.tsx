import { Activity, Archive, ChevronDown, Globe, ListFilter, ShieldCheck, Star, X } from 'lucide-react';
import styles from './stories-filters-menu.module.css';
import type { LucideIcon } from 'lucide-react';
import type { StoriesFilters, StoriesFormatFilter, StoriesOwnerFilter } from '@/lib/stories-page';
import { countActiveFilters, DEFAULT_FILTERS } from '@/lib/stories-page';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export const TOOLBAR_BUTTON_CLASS = styles.tOOLBARBUTTONCLASS;

type ToggleFilterKey = 'certifiedOnly' | 'liveOnly' | 'favoritesOnly' | 'sharedOnly';

const TOGGLE_FILTERS: { key: ToggleFilterKey; label: string; icon: LucideIcon }[] = [
	{ key: 'certifiedOnly', label: 'Certified', icon: ShieldCheck },
	{ key: 'liveOnly', label: 'Live', icon: Activity },
	{ key: 'favoritesOnly', label: 'Favorites', icon: Star },
	{ key: 'sharedOnly', label: 'Shared', icon: Globe },
];

const FORMAT_OPTIONS: { value: StoriesFormatFilter; label: string }[] = [
	{ value: 'any', label: 'Any type' },
	{ value: 'custom', label: 'Custom' },
	{ value: 'classic', label: 'Markdown' },
];

const OWNER_OPTIONS: { value: StoriesOwnerFilter; label: string; chipLabel: string }[] = [
	{ value: 'anyone', label: 'Anyone', chipLabel: '' },
	{ value: 'me', label: 'Me', chipLabel: 'Created by me' },
	{ value: 'others', label: 'Others', chipLabel: 'Created by others' },
];

type FiltersProps = {
	filters: StoriesFilters;
	onFiltersChange: (filters: StoriesFilters) => void;
	showArchived: boolean;
	onShowArchivedChange: (value: boolean) => void;
};

export function StoriesFiltersMenu({ filters, onFiltersChange, showArchived, onShowArchivedChange }: FiltersProps) {
	const activeCount = countActiveFilters(filters) + Number(showArchived);

	function clearAll() {
		onFiltersChange(DEFAULT_FILTERS);
		onShowArchivedChange(false);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant='ghost'
					className={cn(TOOLBAR_BUTTON_CLASS, activeCount > 0 && styles.storiesFiltersMenuButton)}
				>
					<ListFilter />
					Filters
					{activeCount > 0 && <span className={styles.storiesFiltersMenuSpan}>{activeCount}</span>}
					<ChevronDown className={styles.storiesFiltersMenuChevronDown} />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end' className={styles.storiesFiltersMenuDropdownMenuContent}>
				<DropdownMenuLabel>Show only</DropdownMenuLabel>
				{TOGGLE_FILTERS.map(({ key, label, icon: Icon }) => (
					<DropdownMenuCheckboxItem
						key={key}
						checked={filters[key]}
						onCheckedChange={(checked) => onFiltersChange({ ...filters, [key]: checked })}
						onSelect={(event) => event.preventDefault()}
					>
						<Icon />
						{label}
					</DropdownMenuCheckboxItem>
				))}
				<DropdownMenuCheckboxItem
					checked={showArchived}
					onCheckedChange={onShowArchivedChange}
					onSelect={(event) => event.preventDefault()}
				>
					<Archive />
					Archived
				</DropdownMenuCheckboxItem>
				<DropdownMenuSeparator />
				<DropdownMenuLabel>Type</DropdownMenuLabel>
				<DropdownMenuRadioGroup
					value={filters.format}
					onValueChange={(format) => onFiltersChange({ ...filters, format: format as StoriesFormatFilter })}
				>
					{FORMAT_OPTIONS.map((option) => (
						<DropdownMenuRadioItem
							key={option.value}
							value={option.value}
							indicator='check'
							onSelect={(event) => event.preventDefault()}
						>
							{option.label}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
				<DropdownMenuSeparator />
				<DropdownMenuLabel>Created by</DropdownMenuLabel>
				<DropdownMenuRadioGroup
					value={filters.owner}
					onValueChange={(owner) => onFiltersChange({ ...filters, owner: owner as StoriesOwnerFilter })}
				>
					{OWNER_OPTIONS.map((option) => (
						<DropdownMenuRadioItem
							key={option.value}
							value={option.value}
							indicator='check'
							onSelect={(event) => event.preventDefault()}
						>
							{option.label}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
				{activeCount > 0 && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem onSelect={clearAll} className={styles.storiesFiltersMenuDropdownMenuItem}>
							Clear all filters
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function StoriesActiveFilters({ filters, onFiltersChange, showArchived, onShowArchivedChange }: FiltersProps) {
	const activeCount = countActiveFilters(filters) + Number(showArchived);

	if (activeCount === 0) {
		return null;
	}

	const formatChipLabel =
		filters.format === 'any' ? null : FORMAT_OPTIONS.find((o) => o.value === filters.format)?.label;
	const ownerChipLabel = OWNER_OPTIONS.find((option) => option.value === filters.owner)?.chipLabel;

	function clearAll() {
		onFiltersChange(DEFAULT_FILTERS);
		onShowArchivedChange(false);
	}

	return (
		<div className={styles.storiesActiveFiltersDiv}>
			{showArchived && <FilterChip label='Archived' onRemove={() => onShowArchivedChange(false)} />}
			{TOGGLE_FILTERS.filter(({ key }) => filters[key]).map(({ key, label }) => (
				<FilterChip key={key} label={label} onRemove={() => onFiltersChange({ ...filters, [key]: false })} />
			))}
			{formatChipLabel && (
				<FilterChip label={formatChipLabel} onRemove={() => onFiltersChange({ ...filters, format: 'any' })} />
			)}
			{ownerChipLabel && (
				<FilterChip label={ownerChipLabel} onRemove={() => onFiltersChange({ ...filters, owner: 'anyone' })} />
			)}
			{activeCount > 1 && (
				<button type='button' onClick={clearAll} className={styles.storiesActiveFiltersButton}>
					Clear all
				</button>
			)}
		</div>
	);
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
	return (
		<span className={styles.filterChipSpan}>
			{label}
			<button
				type='button'
				onClick={onRemove}
				aria-label={`Remove ${label} filter`}
				className={styles.filterChipButton}
			>
				<X className={styles.filterChipX} />
			</button>
		</span>
	);
}
