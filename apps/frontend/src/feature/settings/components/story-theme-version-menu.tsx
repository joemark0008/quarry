import { describeStoryThemeSources } from '@quarry/shared/story-theme-generation';
import styles from './story-theme-version-menu.module.css';
import type { StoryThemeGeneration } from '@quarry/shared/story-theme-generation';

import { RotateCwFadingClock } from '@/components/icons/rotate-cw-fading-clock';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface ThemeVersionEntry {
	label: string;
	date: Date | null;
	generation: StoryThemeGeneration | null;
}

interface StoryThemeVersionMenuProps {
	entries: ThemeVersionEntry[];
	currentIndex: number;
	onSelect: (index: number) => void;
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };

export function StoryThemeVersionMenu({ entries, currentIndex, onSelect }: StoryThemeVersionMenuProps) {
	const newestFirst = entries.map((entry, index) => ({ entry, index })).reverse();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant='ghost-muted'
					size='sm'
					className={styles.storyThemeVersionMenuButton}
					aria-label='Select theme version'
				>
					<RotateCwFadingClock
						className={styles.storyThemeVersionMenuRotateCwFadingClock}
						strokeWidth={2.25}
					/>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end' className={styles.storyThemeVersionMenuDropdownMenuContent}>
				<DropdownMenuRadioGroup value={String(currentIndex)} onValueChange={(value) => onSelect(Number(value))}>
					{newestFirst.map(({ entry, index }) => (
						<DropdownMenuRadioItem
							key={index}
							value={String(index)}
							indicator='check'
							className={styles.storyThemeVersionMenuDropdownMenuRadioItem}
						>
							<div className={styles.storyThemeVersionMenuDiv}>
								<span className={styles.storyThemeVersionMenuSpan}>
									{entry.label}
									{entry.date && (
										<span className={styles.storyThemeVersionMenuSpan2}>
											{' '}
											· {entry.date.toLocaleString(undefined, DATE_FORMAT)}
										</span>
									)}
								</span>
								<span className={styles.storyThemeVersionMenuSpan3}>{describeEntry(entry)}</span>
							</div>
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function describeEntry({ generation }: ThemeVersionEntry): string {
	if (!generation) {
		return 'Set by hand';
	}
	const sources = describeStoryThemeSources(generation.sources);
	return generation.editedByHand ? `From ${sources}, then edited` : `From ${sources}`;
}
