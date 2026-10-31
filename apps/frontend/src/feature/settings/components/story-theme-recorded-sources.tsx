import {
	BadgeCheck,
	ChevronDown,
	FileText,
	FolderArchive,
	Globe,
	Image as ImageIcon,
	PenLine,
	Stamp,
	TriangleAlert,
	X,
} from 'lucide-react';
import { useState } from 'react';
import styles from './story-theme-recorded-sources.module.css';
import type {
	StoryThemeGeneration,
	StoryThemeSourceKind,
	StoryThemeSourceRecord,
} from '@quarry/shared/story-theme-generation';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ViewedThemeVersion {
	label: string;
	generation: StoryThemeGeneration | null;
}

export const WELL_CLASS = styles.wELLCLASS;

export const SOURCE_ICONS: Record<StoryThemeSourceKind, LucideIcon> = {
	website: Globe,
	image: ImageIcon,
	pdf: FileText,
	zip: FolderArchive,
	logo: Stamp,
	instructions: PenLine,
	'white-label': BadgeCheck,
};

const SOURCE_KIND_LABELS: Record<StoryThemeSourceKind, string> = {
	website: 'Website',
	image: 'Image',
	pdf: 'PDF',
	zip: 'ZIP',
	logo: 'Logo',
	instructions: 'Instructions',
	'white-label': 'White-label',
};

/** The inputs an earlier version was generated from, shown in the wells they were dropped into, read-only. */
export function RecordedSources({ version, onLeave }: { version: ViewedThemeVersion; onLeave: () => void }) {
	const sources = version.generation?.sources ?? [];
	return (
		<div className={styles.recordedSourcesDiv}>
			{sources.map((source, index) => (
				<RecordedSource
					key={`${source.kind}-${index}`}
					source={source}
					instructions={version.generation?.instructions}
				/>
			))}
			{sources.length === 0 && (
				<p className={styles.recordedSourcesP}>
					{version.label} was set by hand, or saved before sources were recorded.
				</p>
			)}
			<div className={styles.recordedSourcesDiv2}>
				<p className={styles.recordedSourcesP2}>
					Files are not kept: their names and sizes are, so a good theme can be traced back to its inputs.
				</p>
				<Button variant='outline' className={styles.recordedSourcesButton} onClick={onLeave}>
					Back to the latest
				</Button>
			</div>
		</div>
	);
}

function RecordedSource({ source, instructions }: { source: StoryThemeSourceRecord; instructions?: string }) {
	const Icon = SOURCE_ICONS[source.kind];
	const text = source.kind === 'instructions' ? (instructions ?? source.name) : source.name;
	return (
		<div className={cn(WELL_CLASS, styles.recordedSourceDiv)}>
			<span className={styles.recordedSourceSpan}>
				<Icon className={styles.recordedSourceIcon} />
			</span>
			<div className={styles.recordedSourceDiv2}>
				<p
					className={cn(source.kind === 'instructions' ? styles.recordedSourceP : styles.recordedSourceP2)}
					title={text}
				>
					{text}
				</p>
				<p className={styles.recordedSourceP3}>
					{[SOURCE_KIND_LABELS[source.kind], source.detail].filter(Boolean).join(' · ')}
				</p>
			</div>
		</div>
	);
}

interface GenerationSummaryProps {
	sentence: string;
	generation: StoryThemeGeneration | null;
	onDismiss?: () => void;
}

/** The bottom line of the card, with a chevron unfolding what the generation kept and why. */
export function GenerationSummary({ sentence, generation, onDismiss }: GenerationSummaryProps) {
	const [expanded, setExpanded] = useState(false);
	const hasDetails = Boolean(generation && (generation.rationale || generation.notes.length > 0));

	return (
		<div className={styles.generationSummaryDiv}>
			<div className={styles.generationSummaryDiv2}>
				<p className={styles.generationSummaryP}>{sentence}</p>
				{hasDetails && (
					<Button
						variant='ghost'
						size='icon'
						className={styles.generationSummaryButton}
						onClick={() => setExpanded((current) => !current)}
						aria-expanded={expanded}
						aria-label={expanded ? 'Hide what the generation kept' : 'Show what the generation kept'}
					>
						<ChevronDown
							className={cn(
								styles.generationSummaryChevronDown,
								expanded && styles.generationSummaryChevronDown2,
							)}
						/>
					</Button>
				)}
				{onDismiss && (
					<Button
						variant='ghost'
						size='icon'
						className={styles.generationSummaryButton2}
						onClick={onDismiss}
						aria-label='Dismiss'
					>
						<X className={styles.generationSummaryX} />
					</Button>
				)}
			</div>
			{generation?.alert && (
				<p className={styles.generationSummaryP2}>
					<TriangleAlert className={styles.generationSummaryTriangleAlert} />
					{generation.alert}
				</p>
			)}
			{expanded && generation && <GenerationDetails generation={generation} />}
		</div>
	);
}

function GenerationDetails({ generation }: { generation: StoryThemeGeneration }) {
	return (
		<div className={styles.generationDetailsDiv}>
			{generation.rationale && <p className={styles.generationDetailsP}>{generation.rationale}</p>}
			{generation.notes.length > 0 && (
				<ul className={styles.generationDetailsUl}>
					{generation.notes.map((note, index) => (
						<li key={index}>{note}</li>
					))}
				</ul>
			)}
			{generation.editedByHand && <p>Settings were then edited by hand before saving.</p>}
		</div>
	);
}
