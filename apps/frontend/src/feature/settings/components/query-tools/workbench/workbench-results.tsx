import { Sparkles } from 'lucide-react';
import styles from './query-workbench.module.css';
import type { QueryToolPreview } from '@/lib/api-types';

import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { ErrorMessage } from '@/components/ui/error-message';
import { Skeleton } from '@/components/ui/skeleton';
import { TableDisplay } from '@/feature/chat/components/tool-calls/display-table';

/** What the last Run returned: rows, or the error with a way to hand it to the assistant. */
export function WorkbenchResults({
	result,
	error,
	isRunning,
	onAskToFix,
}: {
	result: QueryToolPreview | null;
	error?: string;
	isRunning: boolean;
	/** Absent when the assistant can't be used. */
	onAskToFix?: () => void;
}) {
	if (isRunning) {
		return <Skeleton className={styles.resultsSkeleton} />;
	}
	if (error) {
		return (
			<div className={styles.resultsError}>
				<ErrorMessage message={error} />
				{onAskToFix && (
					<Button variant='outline' size='sm' onClick={onAskToFix}>
						<Sparkles />
						Ask assistant to fix
					</Button>
				)}
			</div>
		);
	}
	if (!result) {
		return <Empty>Run the query to see its results.</Empty>;
	}
	return (
		<div className={styles.resultsTable} data-testid='query-tool-preview'>
			<span className={styles.mutedText}>
				{result.rowCount} {result.rowCount === 1 ? 'row' : 'rows'}
				{result.truncated ? ' (first rows only)' : ''}
			</span>
			<TableDisplay
				data={result.rows}
				columns={result.columns}
				emptyLabel='No rows returned'
				maxRowsBeforePagination={50}
			/>
		</div>
	);
}
