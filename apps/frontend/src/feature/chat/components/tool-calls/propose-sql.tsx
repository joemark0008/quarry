import { Check, CircleAlert, Copy, CornerDownLeft } from 'lucide-react';
import { memo, useState } from 'react';
import styles from './propose-sql.module.css';
import type { ToolCallComponentProps } from '.';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryWorkbench } from '@/contexts/query-workbench';

/** A query the agent offers in the query workbench: nothing reaches the editor until the user applies it. */
export const ProposeSqlToolCall = memo(({ toolPart }: ToolCallComponentProps<'propose_sql'>) => {
	const workbench = useQueryWorkbench();
	const [isCopied, setIsCopied] = useState(false);
	const { sql, database_id: databaseId, summary } = toolPart.input ?? {};

	if (!sql) {
		return toolPart.state === 'input-streaming' ? <Skeleton className={styles.proposeSqlSkeleton} /> : null;
	}

	const tested = toolPart.output?.tested === true;
	const isApplied = workbench?.sql.trim() === sql.trim();

	return (
		<div className={styles.proposeSqlCard} data-testid='propose-sql'>
			{summary && <p className={styles.proposeSqlSummary}>{summary}</p>}
			<pre className={styles.proposeSqlCode}>
				<code>{sql}</code>
			</pre>
			<div className={styles.proposeSqlFooter}>
				<span className={tested ? styles.proposeSqlTested : styles.proposeSqlUntested}>
					{tested ? <Check /> : <CircleAlert />}
					{tested ? 'Tested' : 'Not tested'}
				</span>
				{workbench ? (
					<Button
						size='sm'
						variant={isApplied ? 'outline' : 'default'}
						disabled={isApplied || toolPart.state === 'input-streaming'}
						onClick={() => workbench.applySql(sql, databaseId)}
					>
						{isApplied ? <Check /> : <CornerDownLeft />}
						{isApplied ? 'In the editor' : 'Apply to editor'}
					</Button>
				) : (
					<Button
						size='sm'
						variant='outline'
						onClick={() => {
							void navigator.clipboard.writeText(sql);
							setIsCopied(true);
						}}
					>
						{isCopied ? <Check /> : <Copy />}
						{isCopied ? 'Copied' : 'Copy'}
					</Button>
				)}
			</div>
		</div>
	);
});
