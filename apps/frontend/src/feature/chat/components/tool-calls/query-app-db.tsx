import { useState } from 'react';
import { Streamdown } from 'streamdown';
import { Code, Copy, Table as TableIcon } from 'lucide-react';
import { ToolCallWrapper } from './tool-call-wrapper';
import { ToolOutputFallback } from './tool-output-fallback';
import { TableDisplay } from './display-table';
import styles from './query-app-db.module.css';
import type { ToolCallComponentProps } from '.';
import { useToolCallContext } from '@/contexts/tool-call';

type ViewMode = 'results' | 'query';

interface QueryAppDbInput {
	sql?: string;
}

interface QueryAppDbOutput {
	columns: string[];
	rows: Record<string, unknown>[];
	rowCount: number;
}

export const QueryAppDbToolCall = ({ toolPart }: ToolCallComponentProps) => {
	const [viewMode, setViewMode] = useState<ViewMode>('results');
	const { isSettled } = useToolCallContext();

	const input = toolPart.input as QueryAppDbInput | undefined;
	const output = toolPart.output as QueryAppDbOutput | undefined;

	const actions = [
		{
			id: 'results',
			label: <TableIcon className={styles.actionsTableIcon} strokeWidth={2.25} />,
			expandOnClick: true,
			isActive: viewMode === 'results',
			onClick: () => setViewMode('results'),
			title: 'View results',
		},
		{
			id: 'query',
			label: <Code className={styles.actionsTableIcon} strokeWidth={2.25} />,
			expandOnClick: true,
			isActive: viewMode === 'query',
			onClick: () => setViewMode('query'),
			title: 'View query',
		},
		{
			id: 'copy',
			label: <Copy className={styles.actionsTableIcon} strokeWidth={2.25} />,
			onClick: () => {
				navigator.clipboard.writeText(input?.sql ?? '');
			},
			title: 'Copy query',
		},
	];

	return (
		<ToolCallWrapper
			defaultExpanded={false}
			overrideError={viewMode === 'query'}
			title={
				<span>
					SQL <span className={styles.queryAppDbToolCallSpan}>{input?.sql}</span>
				</span>
			}
			badge={output ? `${output.rowCount} rows` : undefined}
			actions={isSettled ? actions : []}
		>
			{viewMode === 'query' && input?.sql ? (
				<div className={`${styles.queryAppDbToolCallDiv} hide-code-header`}>
					<Streamdown mode='static' controls={{ code: false }}>
						{`\`\`\`sql\n${input.sql}\n\`\`\``}
					</Streamdown>
				</div>
			) : output ? (
				<TableDisplay
					data={output.rows}
					columns={output.columns}
					tableContainerClassName={styles.queryAppDbToolCallTableDisplay}
					showRowCount={false}
				/>
			) : (
				<ToolOutputFallback runningLabel='Executing query...' />
			)}
		</ToolCallWrapper>
	);
};
