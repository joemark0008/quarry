import { ChevronRight, FilePen, FilePlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SidePanelHeader } from './side-panel-header';
import styles from './recommendation-diff-panel.module.css';
import type { MouseEvent } from 'react';

import type { LineDiff } from '@/lib/line-diff';
import { FileDiffBody } from '@/feature/settings/components/file-diff';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { computeLineDiff } from '@/lib/line-diff';

interface ProposedEdit {
	path: string;
	kind: 'edit' | 'create';
	oldContent: string;
	newContent: string;
}

interface RecommendationDiffPanelProps {
	title: string;
	edits: ProposedEdit[];
}

export function RecommendationDiffPanel({ title, edits }: RecommendationDiffPanelProps) {
	const diffs = useMemo(
		() => edits.map((edit) => ({ edit, diff: computeLineDiff(edit.oldContent, edit.newContent) })),
		[edits],
	);

	const allPaths = useMemo(() => edits.map((edit) => edit.path), [edits]);
	const [openPaths, setOpenPaths] = useState<string[]>(() => (edits.length > 0 ? [edits[0].path] : []));

	const handleTriggerClick = (event: MouseEvent, path: string) => {
		if (!event.altKey) {
			return;
		}
		event.preventDefault();
		const isOpen = openPaths.includes(path);
		setOpenPaths(isOpen ? [] : allPaths);
	};

	return (
		<div className={styles.recommendationDiffPanelDiv}>
			<SidePanelHeader label='Proposed changes' title={title} />

			<div className={styles.recommendationDiffPanelDiv2}>
				<Accordion
					type='multiple'
					value={openPaths}
					onValueChange={setOpenPaths}
					className={styles.recommendationDiffPanelAccordion}
				>
					{diffs.map(({ edit, diff }) => (
						<FileDiff key={edit.path} edit={edit} diff={diff} onTriggerClick={handleTriggerClick} />
					))}
				</Accordion>
			</div>
		</div>
	);
}

function FileDiff({
	edit,
	diff,
	onTriggerClick,
}: {
	edit: ProposedEdit;
	diff: LineDiff;
	onTriggerClick: (event: MouseEvent, path: string) => void;
}) {
	return (
		<AccordionItem value={edit.path} className={styles.fileDiffAccordionItem}>
			<AccordionTrigger
				onClick={(event) => onTriggerClick(event, edit.path)}
				className={`${styles.fileDiffAccordionTrigger} group`}
			>
				<ChevronRight className={styles.fileDiffChevronRight} />
				{edit.kind === 'create' ? (
					<FilePlus className={styles.fileDiffFilePlus} />
				) : (
					<FilePen className={styles.fileDiffFilePen} />
				)}
				<span className={styles.fileDiffSpan} title={edit.path}>
					{edit.path}
				</span>
				<span className={styles.fileDiffSpan2}>+{diff.additions}</span>
				<span className={styles.fileDiffSpan3}>-{diff.deletions}</span>
			</AccordionTrigger>
			<AccordionContent className={styles.fileDiffAccordionContent}>
				<FileDiffBody lines={diff.lines} />
			</AccordionContent>
		</AccordionItem>
	);
}
