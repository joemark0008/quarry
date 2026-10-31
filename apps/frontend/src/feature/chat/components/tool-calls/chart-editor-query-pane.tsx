import { ArrowLeft } from 'lucide-react';
import type { executeSql } from '@quarry/shared/tools';

import { SqlQueryEditor } from '@/feature/stories/components/side-panel/sql-editor';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import styles from './chart-editor-query-pane.module.css';

interface ChartEditorQueryPaneProps {
	input: executeSql.Input;
	output: executeSql.Output;
	toolCallId?: string;
	onOutputChange: (output: executeSql.Output) => void;
	onClose: () => void;
	className?: string;
}

/** Chart space of the chart editor while the source query is being edited. */
export function ChartEditorQueryPane({
	input,
	output,
	toolCallId,
	onOutputChange,
	onClose,
	className,
}: ChartEditorQueryPaneProps) {
	return (
		<div className={cn(styles.chartEditorQueryPaneDiv, className)}>
			<div className={styles.chartEditorQueryPaneDiv2}>
				<span className={styles.chartEditorQueryPaneSpan}>Query editor</span>
				<Button type='button' variant='ghost' size='sm' className={styles.chartEditorQueryPaneButton} onClick={onClose}>
					<ArrowLeft className={styles.chartEditorQueryPaneArrowLeft} /> Back to chart
				</Button>
			</div>
			<SqlQueryEditor
				input={input}
				output={output}
				toolCallId={toolCallId}
				editable
				onOutputChange={onOutputChange}
			/>
		</div>
	);
}
