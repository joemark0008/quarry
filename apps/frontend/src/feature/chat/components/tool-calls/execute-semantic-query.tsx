import { useState } from 'react';
import { Code, Copy, Download, Layers, Palette, PanelRight, Table as TableIcon } from 'lucide-react';
import { ToolCallWrapper } from './tool-call-wrapper';
import { ToolOutputFallback } from './tool-output-fallback';
import { TableFormatEditDialog } from './display-table-edit-dialog';
import { SqlQueryDisplay } from './sql-query-display';
import { SqlResultDisplay } from './sql-result-display';
import type { ActionButton } from './tool-call-wrapper';
import type { ToolCallComponentProps } from '.';
import type { ColumnConditionalFormats } from '@quarry/shared/conditional-formatting';
import { useSidePanel } from '@/contexts/side-panel';
import { useLoadAllQueryRows, useQueryRowsSource } from '@/hooks/use-query-rows';
import { useToolCallContext } from '@/contexts/tool-call';
import { SidePanelContent } from '@/feature/stories/components/side-panel/sql-editor';
import { semanticQueryAsSql } from '@/lib/execute-sql-messages';
import styles from './execute-semantic-query.module.css';

type ViewMode = 'results' | 'definition' | 'sql';

export const ExecuteSemanticQueryToolCall = ({
	toolPart: { output, input, state, toolCallId },
}: ToolCallComponentProps<'execute_semantic_query'>) => {
	const [viewMode, setViewMode] = useState<ViewMode>('results');
	const [conditionalFormats, setConditionalFormats] = useState<ColumnConditionalFormats>({});
	const [isFormatOpen, setIsFormatOpen] = useState(false);
	const { isSettled } = useToolCallContext();
	const { open: openSidePanel } = useSidePanel();
	const rowsSource = useQueryRowsSource(toolCallId, output);
	const loadAllRows = useLoadAllQueryRows(rowsSource);

	const openViewer = () => {
		if (state === 'input-streaming' || !output) {
			return;
		}
		const asSql = semanticQueryAsSql(input, output);
		openSidePanel(
			<SidePanelContent input={asSql.input!} output={output} toolCallId={toolCallId} editable={false} />,
		);
	};

	const actions: ActionButton[] = [
		{
			id: 'results',
			label: <TableIcon className={styles.actionsTableIcon} strokeWidth={2.25} />,
			expandOnClick: true,
			isActive: viewMode === 'results',
			onClick: () => setViewMode('results'),
			title: 'View results',
		},
		{
			id: 'definition',
			label: <Layers className={styles.actionsTableIcon} strokeWidth={2.25} />,
			expandOnClick: true,
			isActive: viewMode === 'definition',
			onClick: () => setViewMode('definition'),
			title: 'View semantic query',
		},
		{
			id: 'sql',
			label: <Code className={styles.actionsTableIcon} strokeWidth={2.25} />,
			expandOnClick: true,
			isActive: viewMode === 'sql',
			onClick: () => setViewMode('sql'),
			title: 'View compiled SQL',
		},
		{
			id: 'format',
			label: <Palette className={styles.actionsTableIcon} strokeWidth={2.25} />,
			onClick: () => {
				if (!output) {
					return;
				}
				setViewMode('results');
				setIsFormatOpen(true);
			},
			title: 'Conditional formatting',
		},
		{
			id: 'copy',
			label: <Copy className={styles.actionsTableIcon} strokeWidth={2.25} />,
			onClick: () => {
				navigator.clipboard.writeText(output?.compiled_sql ?? '');
			},
			title: 'Copy compiled SQL',
		},
		...(output
			? [
					{
						id: 'download',
						label: <Download className={styles.actionsTableIcon} strokeWidth={2.25} />,
						title: 'Export results',
						export: {
							columns: output.columns,
							data: output.data as Record<string, unknown>[],
							filename: input?.name || 'semantic-query',
							loadAllRows,
						},
					},
				]
			: []),
		{
			id: 'open',
			label: <PanelRight className={styles.actionsTableIcon} strokeWidth={2.25} />,
			onClick: openViewer,
			title: 'Open in side panel',
		},
	];

	return (
		<ToolCallWrapper
			defaultExpanded={false}
			overrideError={viewMode === 'definition'}
			title={
				<span className={styles.executeSemanticQueryToolCallSpan}>
					<span className={styles.executeSemanticQueryToolCallSpan2}>Semantic query</span>
					<span className={styles.executeSemanticQueryToolCallSpan3}>
						{input?.name ?? (input ? summarizeSemanticQuery(input) : undefined)}
					</span>
				</span>
			}
			badge={output?.row_count && `${output.row_count} rows`}
			actions={isSettled ? actions : []}
		>
			{viewMode === 'definition' && input ? (
				<SemanticQueryDefinition query={input} />
			) : viewMode === 'sql' && output ? (
				<SqlQueryDisplay query={output.compiled_sql} />
			) : output ? (
				<>
					<SqlResultDisplay output={output} rowsSource={rowsSource} conditionalFormats={conditionalFormats} />
					<TableFormatEditDialog
						open={isFormatOpen}
						onOpenChange={setIsFormatOpen}
						columns={output.columns}
						data={output.data as Record<string, unknown>[]}
						formats={conditionalFormats}
						onSave={async (next) => setConditionalFormats(next)}
						description='Apply conditional formatting to columns of this result.'
					/>
				</>
			) : (
				<ToolOutputFallback runningLabel='Compiling and executing query...' />
			)}
		</ToolCallWrapper>
	);
};

/** The input as the UI sees it, possibly still streaming: every field and array item may be missing. */
type PartialSemanticQuery = NonNullable<ToolCallComponentProps<'execute_semantic_query'>['toolPart']['input']>;

function SemanticQueryDefinition({ query }: { query: PartialSemanticQuery }) {
	const rows: { label: string; values: string[] }[] = [
		{ label: 'Metrics', values: definedValues(query.metrics) },
		{ label: 'Group by', values: definedValues(query.group_by) },
		{ label: 'Where', values: definedValues(query.where) },
		{ label: 'Order by', values: definedValues(query.order_by) },
		{ label: 'Limit', values: query.limit !== undefined ? [String(query.limit)] : [] },
		{ label: 'From', values: query.start_time ? [query.start_time] : [] },
		{ label: 'To', values: query.end_time ? [query.end_time] : [] },
	];

	return (
		<dl className={styles.semanticQueryDefinitionDl}>
			{rows
				.filter((row) => row.values.length > 0)
				.map((row) => (
					<div key={row.label} className={styles.semanticQueryDefinitionDiv}>
						<dt className={styles.semanticQueryDefinitionDt}>{row.label}</dt>
						<dd className={styles.semanticQueryDefinitionDd}>
							{row.values.map((value) => (
								<code key={value} className={styles.semanticQueryDefinitionCode}>
									{value}
								</code>
							))}
						</dd>
					</div>
				))}
		</dl>
	);
}

function summarizeSemanticQuery(query: PartialSemanticQuery): string {
	const metrics = definedValues(query.metrics);
	const groupBy = definedValues(query.group_by);
	return groupBy.length > 0 ? `${metrics.join(', ')} by ${groupBy.join(', ')}` : metrics.join(', ');
}

function definedValues(values: (string | undefined)[] | undefined): string[] {
	return values?.filter((value): value is string => value !== undefined) ?? [];
}
