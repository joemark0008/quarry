import { Fragment, useMemo, useState } from 'react';
import { UnfoldVertical } from 'lucide-react';

import styles from './file-diff.module.css';
import type { DiffLine } from '@/lib/line-diff';
import { cn } from '@/lib/utils';

const CONTEXT_LINES = 3;
const MIN_COLLAPSE = 2;

type DiffRow = { type: 'line'; line: DiffLine } | { type: 'gap'; lines: DiffLine[] };

export function FileDiffBody({ lines }: { lines: DiffLine[] }) {
	const rows = useMemo(() => buildDiffRows(lines, CONTEXT_LINES), [lines]);
	const [expandedGaps, setExpandedGaps] = useState<Set<number>>(() => new Set());

	const expandGap = (index: number) => setExpandedGaps((current) => new Set(current).add(index));

	return (
		<div className={styles.fileDiffBodyDiv}>
			{rows.map((row, index) => {
				if (row.type === 'line') {
					return <DiffLineRow key={index} line={row.line} />;
				}
				if (expandedGaps.has(index)) {
					return (
						<Fragment key={index}>
							{row.lines.map((line, lineIndex) => (
								<DiffLineRow key={lineIndex} line={line} />
							))}
						</Fragment>
					);
				}
				return (
					<button
						key={index}
						type='button'
						onClick={() => expandGap(index)}
						className={styles.fileDiffBodyButton}
					>
						<UnfoldVertical className={styles.fileDiffBodyUnfoldVertical} />
						<span>
							Show {row.lines.length} unchanged {row.lines.length === 1 ? 'line' : 'lines'}
						</span>
					</button>
				);
			})}
		</div>
	);
}

function DiffLineRow({ line }: { line: DiffLine }) {
	return (
		<div
			className={cn(
				styles.diffLineRowDiv,
				line.type === 'add' && styles.diffLineRowDiv2,
				line.type === 'remove' && styles.diffLineRowDiv3,
			)}
		>
			<span className={styles.diffLineRowSpan}>{line.oldNumber ?? ''}</span>
			<span className={styles.diffLineRowSpan}>{line.newNumber ?? ''}</span>
			<span
				className={cn(
					styles.diffLineRowSpan2,
					line.type === 'add' && styles.diffLineRowSpan3,
					line.type === 'remove' && styles.diffLineRowSpan4,
				)}
			>
				{line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ''}
			</span>
			<span className={styles.diffLineRowSpan5}>{line.text || ' '}</span>
		</div>
	);
}

function buildDiffRows(lines: DiffLine[], context: number): DiffRow[] {
	const visible = new Array<boolean>(lines.length).fill(false);
	lines.forEach((line, index) => {
		if (line.type === 'context') {
			return;
		}
		const start = Math.max(0, index - context);
		const end = Math.min(lines.length - 1, index + context);
		for (let current = start; current <= end; current++) {
			visible[current] = true;
		}
	});

	const rows: DiffRow[] = [];
	let hidden: DiffLine[] = [];
	const flushHidden = () => {
		if (hidden.length === 0) {
			return;
		}
		if (hidden.length < MIN_COLLAPSE) {
			hidden.forEach((line) => rows.push({ type: 'line', line }));
		} else {
			rows.push({ type: 'gap', lines: hidden });
		}
		hidden = [];
	};

	lines.forEach((line, index) => {
		if (visible[index]) {
			flushHidden();
			rows.push({ type: 'line', line });
		} else {
			hidden.push(line);
		}
	});
	flushHidden();
	return rows;
}
