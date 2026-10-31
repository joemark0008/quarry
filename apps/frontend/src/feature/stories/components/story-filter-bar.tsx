import { AlertTriangle, FilterX, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isFilterSelectionActive } from '@quarry/shared/sql-template';
import type { StoryFilterSelection } from '@quarry/shared/sql-template';
import type { DateRange } from 'react-day-picker';
import type { ParsedFilterBlock } from '@quarry/shared/story-segments';

import type { StoryFilterApi } from '@/hooks/use-story-filters';
import { DateRangePicker } from '@/components/date-range-picker';
import { FixInChatButton } from '@/feature/chat/components/fix-in-chat-button';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { storyApi } from '@/lib/story-api';
import styles from './story-filter-bar.module.css';

const CLEAR_SELECT_VALUE = '__quarry_clear_filter__';
const SELECT_VALUE_PREFIX = '__quarry_filter_value__:';

export function StoryFilterBar({
	filters,
	selections,
	onSelectionChange,
	onClear,
	api,
}: {
	filters: ParsedFilterBlock[];
	selections: Record<string, StoryFilterSelection>;
	onSelectionChange: (filterId: string, selection: StoryFilterSelection) => void;
	onClear: () => void;
	api?: StoryFilterApi | null;
}) {
	const [optionErrors, setOptionErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		const filterIds = new Set(filters.map((filter) => filter.id));
		setOptionErrors((current) => {
			const next = Object.fromEntries(Object.entries(current).filter(([id]) => filterIds.has(id)));
			return Object.keys(next).length === Object.keys(current).length ? current : next;
		});
	}, [filters]);

	const reportOptionError = useCallback((filterId: string, error: string | null) => {
		setOptionErrors((current) => {
			if (error) {
				if (current[filterId] === error) {
					return current;
				}
				return { ...current, [filterId]: error };
			}
			if (!(filterId in current)) {
				return current;
			}
			const next = { ...current };
			delete next[filterId];
			return next;
		});
	}, []);

	if (filters.length === 0) {
		return null;
	}

	const hasActiveFilters = Object.values(selections).some((selection) =>
		typeof selection === 'string' ? Boolean(selection) : selection.some(Boolean),
	);

	return (
		<div className={styles.storyFilterBarDiv}>
			<div className={`${styles.storyFilterBarDiv2} quarry-filter-bar`}>
				{filters.map((filter) => (
					<StoryFilterControl
						key={filter.id}
						filter={filter}
						selection={selections[filter.id]}
						onChange={(selection) => onSelectionChange(filter.id, selection)}
						onOptionError={reportOptionError}
						api={api}
					/>
				))}
				{hasActiveFilters && (
					<Button variant='ghost' size='sm' className={`${styles.storyFilterBarButton} quarry-filter__clear`} onClick={onClear}>
						<FilterX className={styles.storyFilterBarFilterX} />
						Clear
					</Button>
				)}
			</div>
			<FilterOptionsErrorBanner filters={filters} errors={optionErrors} />
		</div>
	);
}

function StoryFilterControl({
	filter,
	selection,
	onChange,
	onOptionError,
	api,
}: {
	filter: ParsedFilterBlock;
	selection: StoryFilterSelection | undefined;
	onChange: (selection: StoryFilterSelection) => void;
	onOptionError: (filterId: string, error: string | null) => void;
	api?: StoryFilterApi | null;
}) {
	const { options, error, isLoading } = useFilterOptions(filter, api);

	useEffect(() => {
		onOptionError(filter.id, error);
	}, [filter.id, error, onOptionError]);

	const isActive = isFilterSelectionActive(filter.filterType, selection);

	return (
		<div className={`${styles.storyFilterControlDiv} quarry-filter`} data-active={isActive || undefined}>
			<div className={styles.storyFilterControlDiv2}>
				<span className={`${styles.storyFilterControlSpan} quarry-label`}>{filter.label}</span>
				{isActive && (
					<button
						type='button'
						className={styles.storyFilterControlButton}
						aria-label={`Clear ${filter.label}`}
						onClick={() => onChange(emptySelection(filter.filterType))}
					>
						<X className={styles.storyFilterControlX} />
					</button>
				)}
			</div>
			{filter.filterType === 'select' ? (
				isLoading ? (
					<FilterOptionsLoading />
				) : (
					<Select
						value={
							typeof selection === 'string' && selection
								? `${SELECT_VALUE_PREFIX}${selection}`
								: CLEAR_SELECT_VALUE
						}
						onValueChange={(value) =>
							onChange(value === CLEAR_SELECT_VALUE ? '' : value.slice(SELECT_VALUE_PREFIX.length))
						}
					>
						<SelectTrigger className={`${styles.storyFilterControlSelectTrigger} quarry-filter__control`}>
							<SelectValue placeholder='All' />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={CLEAR_SELECT_VALUE}>All</SelectItem>
							{options.map((option) => (
								<SelectItem key={option} value={`${SELECT_VALUE_PREFIX}${option}`}>
									{option}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)
			) : filter.filterType === 'multi_select' ? (
				isLoading ? (
					<FilterOptionsLoading />
				) : (
					<MultiSelectFilter
						options={options}
						value={Array.isArray(selection) ? selection : []}
						onChange={onChange}
					/>
				)
			) : filter.filterType === 'date_range' ? (
				<RangeFilter value={Array.isArray(selection) ? selection : []} onChange={onChange} />
			) : (
				<Input
					type='search'
					className={`${styles.storyFilterControlInput} quarry-filter__control`}
					placeholder='Search'
					value={typeof selection === 'string' ? selection : ''}
					onChange={(event) => onChange(event.target.value)}
				/>
			)}
		</div>
	);
}

function emptySelection(filterType: ParsedFilterBlock['filterType']): StoryFilterSelection {
	return filterType === 'select' || filterType === 'search' ? '' : [];
}

function FilterOptionsLoading() {
	return (
		<div className={`${styles.filterOptionsLoadingDiv} quarry-filter__control`}>
			<Loader2 className={styles.filterOptionsLoadingLoader2} />
			Loading…
		</div>
	);
}

function MultiSelectFilter({
	options,
	value,
	onChange,
}: {
	options: string[];
	value: string[];
	onChange: (value: string[]) => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant='outline'
					size='sm'
					className={`${styles.multiSelectFilterButton} quarry-filter__control`}
				>
					{value.length > 0 ? `${value.length} selected` : 'All'}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className={styles.multiSelectFilterDropdownMenuContent}>
				{options.map((option) => (
					<DropdownMenuCheckboxItem
						key={option}
						checked={value.includes(option)}
						onSelect={(event) => event.preventDefault()}
						onCheckedChange={(checked) =>
							onChange(checked ? [...value, option] : value.filter((candidate) => candidate !== option))
						}
					>
						{option}
					</DropdownMenuCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function RangeFilter({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
	return (
		<DateRangePicker
			value={toDateRange(value)}
			onChange={(range) => onChange(fromDateRange(range))}
			placeholder='All dates'
			className='quarry-filter__control'
		/>
	);
}

function toDateRange(value: string[]): DateRange | undefined {
	const from = parseDateString(value[0]);
	const to = parseDateString(value[1]);
	if (!from && !to) {
		return undefined;
	}
	return { from, to };
}

function fromDateRange(range: DateRange | undefined): string[] {
	return [range?.from ? format(range.from, 'yyyy-MM-dd') : '', range?.to ? format(range.to, 'yyyy-MM-dd') : ''];
}

function parseDateString(value: string | undefined): Date | undefined {
	if (!value) {
		return undefined;
	}
	const [year, month, day] = value.split('-').map(Number);
	if (!year || !month || !day) {
		return undefined;
	}
	const date = new Date(year, month - 1, day);
	const isSameCalendarDate = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
	return isSameCalendarDate ? date : undefined;
}

function FilterOptionsErrorBanner({
	filters,
	errors,
}: {
	filters: ParsedFilterBlock[];
	errors: Record<string, string>;
}) {
	const errorItems = filters
		.map((filter) => {
			const message = errors[filter.id];
			return message ? { id: filter.id, label: filter.label, message } : null;
		})
		.filter((item): item is { id: string; label: string; message: string } => item !== null);

	if (errorItems.length === 0) {
		return null;
	}

	const fixMessage = [
		"I'm seeing errors loading story filter options:",
		...errorItems.map((error) => `- Filter "${error.label}" (id: ${error.id}): ${error.message}`),
		'',
		'Please fix the filter definition. For table+column select filters with multiple databases, set database_id on the <filter> tag. Use a valid table/column identifier for the warehouse dialect (backticks for BigQuery hyphens).',
	].join('\n');

	return (
		<div className={styles.filterOptionsErrorBannerDiv}>
			<div className={styles.filterOptionsErrorBannerDiv2}>
				<div className={styles.filterOptionsErrorBannerDiv3}>
					<AlertTriangle className={styles.filterOptionsErrorBannerAlertTriangle} />
					<span>Failed to load filter options</span>
				</div>
				<ul className={styles.filterOptionsErrorBannerUl}>
					{errorItems.map((error) => (
						<li key={error.id} className={styles.filterOptionsErrorBannerLi}>
							<span className={styles.filterOptionsErrorBannerSpan}>{error.label}:</span> {error.message}
						</li>
					))}
				</ul>
			</div>
			<FixInChatButton message={fixMessage} className={styles.filterOptionsErrorBannerFixInChatButton} />
		</div>
	);
}

function useFilterOptions(
	filter: ParsedFilterBlock,
	api?: StoryFilterApi | null,
): { options: string[]; error: string | null; isLoading: boolean } {
	const usesHardcodedOptions = Boolean(filter.options?.length);
	const needsRemoteOptions =
		!usesHardcodedOptions && (filter.filterType === 'select' || filter.filterType === 'multi_select');

	const ownedQuery = useQuery({
		...storyApi.story.getFilterOptions.queryOptions({
			chatId: api?.kind === 'owned' ? api.chatId : '',
			storySlug: api?.kind === 'owned' ? api.storySlug : '',
			filterId: filter.id,
		}),
		enabled: Boolean(api?.kind === 'owned' && needsRemoteOptions),
	});

	const sharedQuery = useQuery({
		...storyApi.storyShare.getFilterOptions.queryOptions({
			storyId: api?.kind === 'shared' ? api.storyId : '',
			filterId: filter.id,
		}),
		enabled: Boolean(api?.kind === 'shared' && needsRemoteOptions),
	});

	if (usesHardcodedOptions) {
		return { options: filter.options ?? [], error: null, isLoading: false };
	}

	const query = api?.kind === 'shared' ? sharedQuery : ownedQuery;
	return {
		options: query.data?.options ?? [],
		error: query.error?.message ?? null,
		isLoading: needsRemoteOptions && Boolean(api) && query.isPending,
	};
}
