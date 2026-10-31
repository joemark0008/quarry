import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { BookmarkPlus, Code, Copy, Download, Palette, Pencil, Table as TableIcon } from 'lucide-react';
import { ToolCallWrapper } from './tool-call-wrapper';
import { ToolOutputFallback } from './tool-output-fallback';
import { TableFormatEditDialog } from './display-table-edit-dialog';
import { SqlQueryDisplay } from './sql-query-display';
import { SqlResultDisplay } from './sql-result-display';
import styles from './execute-sql.module.css';
import type { ActionButton } from './tool-call-wrapper';
import type { ToolCallComponentProps } from '.';
import type { ColumnConditionalFormats } from '@quarry/shared/conditional-formatting';
import type { executeSql } from '@quarry/shared/tools';
import { usePermissions } from '@/hooks/use-permissions';
import { useOptionalAgentContext } from '@/contexts/agent.provider';
import { useSidePanel } from '@/contexts/side-panel';
import { useLoadAllQueryRows, useQueryRowsSource } from '@/hooks/use-query-rows';
import { useToolCallContext } from '@/contexts/tool-call';
import { SidePanelContent } from '@/feature/stories/components/side-panel/sql-editor';

type ViewMode = 'results' | 'query';

export const ExecuteSqlToolCall = ({
	toolPart: { output, input, state, toolCallId },
}: ToolCallComponentProps<'execute_sql'>) => (
	<SqlToolCallView
		input={input}
		output={output}
		state={state}
		toolCallId={toolCallId}
		label='SQL'
		subtitle={input?.name ?? input?.sql_query}
		editableInPlace
		saveAsTool
	/>
);

/**
 * A query result in chat: the rows, the SQL, formatting and export. `execute_sql` and saved query tools
 * (`qt_<name>`, whose output is an `execute_sql` result) share it.
 */
export const SqlToolCallView = ({
	input,
	output,
	state,
	toolCallId,
	label,
	subtitle,
	editableInPlace = false,
	saveAsTool = false,
}: {
	input: ToolCallComponentProps<'execute_sql'>['toolPart']['input'];
	output: executeSql.Output | undefined;
	state: string;
	toolCallId: string;
	label: string;
	subtitle?: string;
	/** Whether the side panel may edit the query in place (`execute_sql` only). */
	editableInPlace?: boolean;
	/** Offer "Save as query tool". */
	saveAsTool?: boolean;
}) => {
	const [viewMode, setViewMode] = useState<ViewMode>('results');
	const [conditionalFormats, setConditionalFormats] = useState<ColumnConditionalFormats>({});
	const [isFormatOpen, setIsFormatOpen] = useState(false);
	const { isSettled } = useToolCallContext();
	const { open: openSidePanel } = useSidePanel();
	const agent = useOptionalAgentContext();
	const navigate = useNavigate();
	const { canSendMessages } = usePermissions();
	const isEditable = Boolean(
		editableInPlace && agent && !agent.isReadonly && !agent.isRunning && output?.id && input?.sql_query,
	);
	const rowsSource = useQueryRowsSource(toolCallId, output);
	const loadAllRows = useLoadAllQueryRows(rowsSource);

	const openEditor = (editable: boolean) => {
		if (state === 'input-streaming' || !output || !input) {
			return;
		}
		openSidePanel(
			<SidePanelContent
				input={input as executeSql.Input}
				output={output}
				toolCallId={toolCallId}
				editable={editable}
			/>,
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
			id: 'query',
			label: <Code className={styles.actionsTableIcon} strokeWidth={2.25} />,
			expandOnClick: true,
			isActive: viewMode === 'query',
			onClick: () => setViewMode('query'),
			title: 'View query',
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
				navigator.clipboard.writeText(input?.sql_query ?? '');
			},
			title: 'Copy query',
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
							filename: input?.name || 'query',
							loadAllRows,
						},
					},
				]
			: []),
		{
			id: 'edit',
			label: <Pencil className={styles.actionsTableIcon} strokeWidth={2.25} />,
			onClick: () => openEditor(isEditable),
			title: isEditable ? 'Edit in side panel' : 'Open in side panel',
		},
		...(saveAsTool && canSendMessages && input?.sql_query
			? [
					{
						id: 'save-as-tool',
						label: <BookmarkPlus className={styles.actionsTableIcon} strokeWidth={2.25} />,
						onClick: () =>
							navigate({ to: '/settings/project/query-tools', search: { sql: input.sql_query } }),
						title: 'Save as query tool',
					},
				]
			: []),
	];

	return (
		<ToolCallWrapper
			defaultExpanded={false}
			overrideError={viewMode === 'query'}
			title={
				<span className={styles.sqlToolCallViewSpan}>
					<span className={styles.sqlToolCallViewSpan2}>{label}</span>
					<span className={styles.sqlToolCallViewSpan3}>{subtitle}</span>
				</span>
			}
			badge={output?.row_count && `${output.row_count} rows`}
			actions={isSettled ? actions : []}
		>
			{viewMode === 'query' && input?.sql_query ? (
				<SqlQueryDisplay query={input.sql_query} />
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
				<ToolOutputFallback runningLabel='Executing query...' />
			)}
		</ToolCallWrapper>
	);
};
