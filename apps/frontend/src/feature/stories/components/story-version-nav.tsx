import { RotateCwFadingClock } from '@/components/icons/rotate-cw-fading-clock';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import styles from './story-version-nav.module.css';

export interface StoryVersionNavProps {
	currentVersion: number;
	versionDates: (string | Date)[];
	onSelectVersion: (version: number) => void;
}

const VERSION_DATE_FORMAT: Intl.DateTimeFormatOptions = {
	day: 'numeric',
	month: 'short',
	hour: '2-digit',
	minute: '2-digit',
};

const VERSION_TIME_FORMAT: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

const VERSION_DAY_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };

const VERSION_LABEL_CLASS_NAME = styles.vERSIONLABELCLASSNAME;

export function StoryVersionNav({ currentVersion, versionDates, onSelectVersion }: StoryVersionNavProps) {
	const totalVersions = versionDates.length;
	const currentVersionDate = versionDates[currentVersion - 1];

	if (totalVersions <= 1) {
		return currentVersionDate ? (
			<span
				className={cn(
					styles.storyVersionNavSpan,
					VERSION_LABEL_CLASS_NAME,
				)}
				title={formatVersionDate(currentVersionDate)}
			>
				{formatCompactVersionDate(currentVersionDate)}
			</span>
		) : null;
	}

	const versionsNewestFirst = versionDates.map((date, index) => ({ version: index + 1, date })).reverse();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant='ghost-muted'
					size='sm'
					className={cn(styles.storyVersionNavButton, VERSION_LABEL_CLASS_NAME)}
					aria-label='Select version'
					title={currentVersionDate ? formatVersionDate(currentVersionDate) : undefined}
				>
					<RotateCwFadingClock className={styles.storyVersionNavRotateCwFadingClock} strokeWidth={2.25} />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='center' className={styles.storyVersionNavDropdownMenuContent}>
				<DropdownMenuRadioGroup
					value={String(currentVersion)}
					onValueChange={(value) => onSelectVersion(Number(value))}
				>
					{versionsNewestFirst.map(({ version, date }) => (
						<DropdownMenuRadioItem
							key={version}
							value={String(version)}
							indicator='check'
							onSelect={(event) => event.preventDefault()}
							className={styles.storyVersionNavDropdownMenuRadioItem}
						>
							{formatVersionDate(date)}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function describeViewedVersion(versionDate: string | Date | null | undefined, currentVersion: number): string {
	return versionDate
		? `Viewing the version from ${formatVersionDate(versionDate)}`
		: `Viewing version ${currentVersion}`;
}

function formatVersionDate(date: string | Date): string {
	return new Date(date).toLocaleString(undefined, VERSION_DATE_FORMAT);
}

function formatCompactVersionDate(date: string | Date): string {
	const versionDate = new Date(date);
	const isToday = versionDate.toDateString() === new Date().toDateString();
	return versionDate.toLocaleString(undefined, isToday ? VERSION_TIME_FORMAT : VERSION_DAY_FORMAT);
}
