import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Editor, useMonaco } from '@monaco-editor/react';
import { validateSqlFilterTemplate } from '@quarry/shared/sql-template';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2, Play, Save } from 'lucide-react';
import { usePanelRef } from 'react-resizable-panels';
import { SidePanelHeader } from './side-panel-header';
import styles from './sql-editor.module.css';
import type { Monaco } from '@monaco-editor/react';
import type { UIMessage } from '@quarry/api/agent/types/chat';
import type { executeSql } from '@quarry/shared/tools';
import type { editor } from 'monaco-editor';
import { ResizableSeparator, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

import { useOptionalAgentContext } from '@/contexts/agent.provider';
import { useEditorTheme } from '@/hooks/use-editor-theme';
import { useQueryRowsSource, useServerPaginatedRows } from '@/hooks/use-query-rows';
import { FixInChatButton } from '@/feature/chat/components/fix-in-chat-button';
import { TableDisplay } from '@/feature/chat/components/tool-calls/display-table';
import { Button } from '@/components/ui/button';
import { applyExecuteSqlResultToMessages } from '@/lib/execute-sql-messages';
import { formatSQL } from '@/lib/sql-formatter';
import { SQL_SHIKI_THEME, setupSqlHighlighting } from '@/lib/sql-shiki-theme';
import { chatApi } from '@/lib/chat-api';
import { storyApi } from '@/lib/story-api';

const RESULTS_MIN_HEIGHT = 240;
const SQL_MIN_HEIGHT = 100;
const SEPARATOR_HEIGHT = 12;
const SQL_CONTENT_PADDING = 8;
const RESULTS_PAGE_SIZE = 100;

interface SqlEditorProps {
	input: executeSql.Input;
	output: executeSql.Output;
	toolCallId?: string;
	editable?: boolean;
}

export const SidePanelContent = ({ input, output, toolCallId, editable = false }: SqlEditorProps) => {
	return (
		<div className={styles.sidePanelContentDiv}>
			<SidePanelHeader title={input.name ?? input.sql_query} label={output.id} />
			<SqlQueryEditor input={input} output={output} toolCallId={toolCallId} editable={editable} />
		</div>
	);
};

interface SqlQueryEditorProps extends SqlEditorProps {
	onOutputChange?: (output: executeSql.Output) => void;
}

/** SQL editor with run / save & run actions and the result table underneath. */
export function SqlQueryEditor({ input, output, toolCallId, editable = false, onOutputChange }: SqlQueryEditorProps) {
	const queryClient = useQueryClient();
	const monaco = useMonaco();
	const editorTheme = useEditorTheme();
	const [shikiReady, setShikiReady] = useState(false);
	const agent = useOptionalAgentContext();
	const agentRef = useRef(agent);
	agentRef.current = agent;
	const queryId = output.id;
	const [sqlQuery, setSqlQuery] = useState(input.sql_query);
	const [savedSql, setSavedSql] = useState(input.sql_query);
	const [previewOutput, setPreviewOutput] = useState<executeSql.Output>(output);
	const [error, setError] = useState<string | null>(null);
	const rowsSource = useQueryRowsSource(toolCallId, previewOutput);
	const resultRows = useServerPaginatedRows(
		rowsSource,
		previewOutput.data as Record<string, unknown>[],
		RESULTS_PAGE_SIZE,
	);
	const rootRef = useRef<HTMLDivElement>(null);
	const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
	const sqlPanelRef = usePanelRef();
	const groupElementRef = useRef<HTMLDivElement>(null);
	const sqlQueryRef = useRef(sqlQuery);
	sqlQueryRef.current = sqlQuery;
	const onOutputChangeRef = useRef(onOutputChange);
	onOutputChangeRef.current = onOutputChange;

	useEffect(() => {
		if (!monaco) {
			return;
		}
		let active = true;
		setupSqlHighlighting(monaco).then(() => {
			if (active) {
				setShikiReady(true);
			}
		});
		return () => {
			active = false;
		};
	}, [monaco]);

	const themeName = shikiReady
		? editorTheme === 'vs-dark'
			? SQL_SHIKI_THEME.dark
			: SQL_SHIKI_THEME.light
		: editorTheme;

	useEffect(() => {
		setSqlQuery(input.sql_query);
		setSavedSql(input.sql_query);
		setPreviewOutput(output);
		setError(null);
	}, [queryId]); // eslint-disable-line react-hooks/exhaustive-deps -- reset only when switching queries

	const canEdit = Boolean(editable && queryId && !agent?.isReadonly);
	const isDirty = sqlQuery !== savedSql;
	const validationIssues = useMemo(() => (canEdit ? validateSqlFilterTemplate(sqlQuery) : []), [canEdit, sqlQuery]);

	const previewMutation = useMutation(chatApi.sql.previewQuery.mutationOptions());
	const saveMutation = useMutation(chatApi.sql.updateQuery.mutationOptions());
	const isBusy = previewMutation.isPending || saveMutation.isPending;
	const isBusyRef = useRef(isBusy);
	isBusyRef.current = isBusy;

	const buildMutationInput = useCallback(
		(sql: string) => ({
			queryId: queryId!,
			sql_query: sql,
			database_id: input.database_id ?? undefined,
			name: input.name ?? undefined,
		}),
		[queryId, input.database_id, input.name],
	);

	const beginMutation = useCallback(() => {
		const sql = editorRef.current?.getValue() ?? sqlQueryRef.current;
		if (!queryId || !sql.trim() || isBusyRef.current) {
			return null;
		}
		setSqlQuery(sql);
		setError(null);
		return sql;
	}, [queryId]);

	const handleRun = useCallback(() => {
		const sql = beginMutation();
		if (!sql) {
			return;
		}
		previewMutation.mutate(buildMutationInput(sql), {
			onSuccess: (result) => {
				setPreviewOutput(result);
				setError(null);
				onOutputChangeRef.current?.(result);
			},
			onError: (err) => setError(getMutationErrorMessage(err)),
		});
	}, [beginMutation, buildMutationInput, previewMutation]);

	const handleSaveAndRun = useCallback(() => {
		const sql = beginMutation();
		if (!sql) {
			return;
		}
		saveMutation.mutate(buildMutationInput(sql), {
			onSuccess: (result) => {
				setPreviewOutput(result.output);
				setSqlQuery(result.input.sql_query);
				setSavedSql(result.input.sql_query);
				setError(null);
				onOutputChangeRef.current?.(result.output);

				const applyUpdate = (messages: UIMessage[]) =>
					applyExecuteSqlResultToMessages(messages, result.output.id, result.input, result.output);

				const currentAgent = agentRef.current;
				if (currentAgent) {
					currentAgent.setMessages((messages) => applyUpdate(messages));
					if (currentAgent.chatId) {
						queryClient.setQueryData(
							chatApi.chat.get.queryKey({ chatId: currentAgent.chatId }),
							(previous) =>
								previous ? { ...previous, messages: applyUpdate(previous.messages) } : previous,
						);
					}
				}

				queryClient.removeQueries(chatApi.chat.getQueryRows.pathFilter());
				void queryClient.invalidateQueries(storyApi.story.getQuerySql.pathFilter());
				void queryClient.invalidateQueries(storyApi.story.getFilteredQueryData.pathFilter());
				void queryClient.invalidateQueries(storyApi.storyShare.getQuerySql.pathFilter());
				void queryClient.invalidateQueries(storyApi.storyShare.getFilteredQueryData.pathFilter());
			},
			onError: (err) => setError(getMutationErrorMessage(err)),
		});
	}, [beginMutation, buildMutationInput, saveMutation, queryClient]);

	useEffect(() => {
		if (!canEdit) {
			return;
		}

		const isFocusInsidePanel = (target: EventTarget | null) =>
			target instanceof Node && Boolean(rootRef.current?.contains(target));

		const onKeyDown = (event: KeyboardEvent) => {
			if (!isFocusInsidePanel(event.target)) {
				return;
			}
			const withModifier = (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey;
			if (withModifier && event.key.toLowerCase() === 's') {
				event.preventDefault();
				event.stopPropagation();
				handleSaveAndRun();
				return;
			}
			if (withModifier && event.key === 'Enter') {
				event.preventDefault();
				event.stopPropagation();
				handleRun();
			}
		};

		document.addEventListener('keydown', onKeyDown, true);
		return () => document.removeEventListener('keydown', onKeyDown, true);
	}, [canEdit, handleSaveAndRun, handleRun]);

	const fitSqlPanelToContent = useCallback(
		(instance: editor.IStandaloneCodeEditor) => {
			const groupHeight = groupElementRef.current?.clientHeight ?? 0;
			const panel = sqlPanelRef.current;
			if (!panel || groupHeight <= 0) {
				return false;
			}

			instance.layout();
			const contentHeight = instance.getContentHeight() + SQL_CONTENT_PADDING;
			const maxSqlHeight = Math.max(SQL_MIN_HEIGHT, groupHeight - RESULTS_MIN_HEIGHT - SEPARATOR_HEIGHT);
			const sqlHeight = Math.min(Math.max(contentHeight, SQL_MIN_HEIGHT), maxSqlHeight);
			panel.resize(sqlHeight);
			return true;
		},
		[sqlPanelRef],
	);

	const handleEditorMount = useCallback(
		(instance: editor.IStandaloneCodeEditor, _monaco: Monaco) => {
			editorRef.current = instance;

			let fitted = false;
			const tryFit = () => {
				if (fitted || !fitSqlPanelToContent(instance)) {
					return;
				}
				fitted = true;
				disposable.dispose();
			};
			const disposable = instance.onDidContentSizeChange(tryFit);
			requestAnimationFrame(tryFit);
		},
		[fitSqlPanelToContent],
	);

	return (
		<div ref={rootRef} className={styles.sqlQueryEditorDiv}>
			{canEdit && (
				<div className={styles.sqlQueryEditorDiv2}>
					<div className={styles.sqlQueryEditorDiv3}>
						{isDirty ? 'Unsaved changes' : 'Edit SQL, then run or save'}
					</div>
					<div className={styles.sqlQueryEditorDiv4}>
						<Button
							type='button'
							variant='outline'
							size='sm'
							className={styles.sqlQueryEditorButton}
							onClick={handleRun}
							disabled={isBusy || !sqlQuery.trim()}
						>
							{previewMutation.isPending ? (
								<Loader2 className={styles.sqlQueryEditorLoader2} />
							) : (
								<Play className={styles.sqlQueryEditorPlay} />
							)}
							<span>Run</span>
							<kbd className={styles.sqlQueryEditorKbd}>⌘↵</kbd>
						</Button>
						<Button
							type='button'
							size='sm'
							className={styles.sqlQueryEditorButton}
							onClick={handleSaveAndRun}
							disabled={isBusy || !sqlQuery.trim()}
						>
							{saveMutation.isPending ? (
								<Loader2 className={styles.sqlQueryEditorLoader2} />
							) : (
								<Save className={styles.sqlQueryEditorPlay} />
							)}
							<span>Save & run</span>
							<kbd className={styles.sqlQueryEditorKbd}>⌘S</kbd>
						</Button>
					</div>
				</div>
			)}

			{error && <div className={styles.sqlQueryEditorDiv5}>{error}</div>}
			{validationIssues.length > 0 && <SqlValidationBanner queryId={queryId} issues={validationIssues} />}

			<ResizablePanelGroup
				orientation='vertical'
				className={styles.sqlQueryEditorResizablePanelGroup}
				elementRef={groupElementRef}
			>
				<ResizablePanel
					id='sql'
					minSize={SQL_MIN_HEIGHT}
					panelRef={sqlPanelRef}
					className={`${styles.sqlQueryEditorResizablePanel} group`}
				>
					<div className={styles.sqlQueryEditorDiv6}>
						<Editor
							value={canEdit ? sqlQuery : formatSQL(input.sql_query, output.dialect)}
							onChange={canEdit ? (value) => setSqlQuery(value ?? '') : undefined}
							onMount={handleEditorMount}
							language='sql'
							theme={themeName}
							options={{
								readOnly: !canEdit,
								minimap: {
									enabled: false,
								},
								folding: false,
								lineNumbers: canEdit ? 'on' : 'off',
								scrollbar: {
									horizontal: 'hidden',
									vertical: 'hidden',
								},
								scrollBeyondLastLine: false,
								padding: {
									top: 16,
									bottom: 16,
								},
								wordWrap: 'on',
							}}
						/>
					</div>
				</ResizablePanel>

				<ResizableSeparator withHandle />

				<ResizablePanel id='results' defaultSize={RESULTS_MIN_HEIGHT} minSize={RESULTS_MIN_HEIGHT}>
					<TableDisplay
						data={resultRows.rows}
						serverPagination={resultRows.serverPagination}
						columns={previewOutput.columns}
						className={styles.sqlQueryEditorTableDisplay}
						tableContainerClassName={styles.sqlQueryEditorTableDisplay2}
						emptyLabel={resultRows.isLoadingRows ? 'Loading rows...' : 'No rows returned'}
						maxRowsBeforePagination={RESULTS_PAGE_SIZE}
					/>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}

function SqlValidationBanner({ queryId, issues }: { queryId: string | undefined; issues: string[] }) {
	const fixMessage = [
		`I'm seeing SQL template validation warnings${queryId ? ` for query ${queryId}` : ''}:`,
		...issues.map((issue) => `- ${issue}`),
		'',
		'Please fix the SQL filter template while preserving the query id.',
	].join('\n');

	return (
		<div className={styles.sqlValidationBannerDiv}>
			<div className={styles.sqlValidationBannerDiv2}>
				<div className={styles.sqlValidationBannerDiv3}>
					<AlertTriangle className={styles.sqlValidationBannerAlertTriangle} />
					<span>
						{issues.length} SQL template {issues.length === 1 ? 'warning' : 'warnings'}
					</span>
				</div>
				<ul className={styles.sqlValidationBannerUl}>
					{issues.slice(0, 5).map((issue) => (
						<li key={issue} className={styles.sqlValidationBannerLi}>
							{issue}
						</li>
					))}
					{issues.length > 5 && (
						<li className={styles.sqlValidationBannerLi2}>and {issues.length - 5} more...</li>
					)}
				</ul>
			</div>
			<FixInChatButton message={fixMessage} className={styles.sqlValidationBannerFixInChatButton} />
		</div>
	);
}

function getMutationErrorMessage(err: unknown): string {
	if (err instanceof Error && err.message) {
		return err.message;
	}
	if (err && typeof err === 'object' && 'shape' in err) {
		const shape = (err as { shape?: { message?: string } }).shape;
		if (shape?.message) {
			return shape.message;
		}
	}
	return 'Failed to run query';
}
