import { useQuery as useApolloQuery } from '@apollo/client/react';
import { extractQueryToolPlaceholders } from '@quarry/shared/query-tools';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, ChevronDown, FilePlus, Play, Save, TableProperties } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { QueryToolParameters } from '../query-tool-parameters';
import { QueryToolSqlEditor } from '../query-tool-sql-editor';
import styles from './query-workbench.module.css';
import { SaveQueryToolDialog } from './save-query-tool-dialog';
import { clearStoredDraft, useWorkbenchDraft } from './use-workbench-draft';
import { WorkbenchAssistant } from './workbench-assistant';
import { WorkbenchResults } from './workbench-results';
import { WorkbenchSchema } from './workbench-schema';
import type { editor } from 'monaco-editor';
import type { QueryToolDetails } from './save-query-tool-dialog';
import type { ProjectQueryTool, QueryToolPreview } from '@/lib/api-types';

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Empty } from '@/components/ui/empty';
import { ErrorMessage } from '@/components/ui/error-message';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TabBar } from '@/components/ui/tab-bar';
import { AgentProvider, useAgentContext } from '@/contexts/agent.provider';
import { QueryWorkbenchContext } from '@/contexts/query-workbench';
import { SetChatInputCallbackProvider } from '@/contexts/set-chat-input-callback';
import { WarehouseConnectionsDocument } from '@/graphql/generated/graphql';
import { ChatIdContext } from '@/hooks/use-chat-id';
import { useQueryToolMutations } from '@/queries/use-query-tools';
import { useChatQuery } from '@/queries/use-chat-query';
import { cn } from '@/lib/utils';

const DEFAULT_CONNECTION = '__default__';
const NEW_TOOL_KEY = 'new';

type MobilePane = 'assistant' | 'editor';
type SaveDialog = 'create' | 'details' | null;

/** Write a query first, with or without the assistant, run it, and only then save it as a tool. */
export function QueryWorkbench({
	projectId,
	savedTool,
	initialSql,
	onSaved,
	onNewDraft,
	onBack,
}: {
	projectId: string;
	savedTool?: ProjectQueryTool;
	/** SQL to start from (Save as tool in chat). */
	initialSql?: string;
	onSaved: (toolId: string) => void;
	onNewDraft: () => void;
	onBack: () => void;
}) {
	const { draft, update } = useWorkbenchDraft({
		projectId,
		toolKey: savedTool?.id ?? NEW_TOOL_KEY,
		base: savedTool && {
			sql: savedTool.sqlTemplate,
			parameters: savedTool.parameters,
			databaseId: savedTool.databaseId ?? null,
		},
		initialSql,
	});
	const draftRef = useRef(draft);
	draftRef.current = draft;
	const getWorkbenchContext = useCallback(
		() => ({ sql: draftRef.current.sql, databaseId: draftRef.current.databaseId }),
		[],
	);

	const [conversation, setConversation] = useState({ key: 0, chatId: draft.chatId });
	const startNewConversation = useCallback(() => {
		update({ chatId: undefined });
		setConversation((current) => ({ key: current.key + 1, chatId: undefined }));
	}, [update]);

	// A conversation that no longer loads was deleted: start a new one.
	const storedChat = useChatQuery({ chatId: conversation.chatId });
	useEffect(() => {
		if (conversation.chatId && storedChat.isError) {
			startNewConversation();
		}
	}, [conversation.chatId, storedChat.isError, startNewConversation]);

	return (
		<ChatIdContext.Provider value={conversation.chatId}>
			<SetChatInputCallbackProvider>
				<AgentProvider
					key={conversation.key}
					disableNavigation
					mode='query_workbench'
					getWorkbenchContext={getWorkbenchContext}
				>
					<ChatIdReporter onChange={(chatId) => update({ chatId })} />
					<QueryWorkbenchLayout
						projectId={projectId}
						savedTool={savedTool}
						draft={draft}
						update={update}
						onSaved={onSaved}
						onNewDraft={onNewDraft}
						onBack={onBack}
						onNewConversation={startNewConversation}
					/>
				</AgentProvider>
			</SetChatInputCallbackProvider>
		</ChatIdContext.Provider>
	);
}

function ChatIdReporter({ onChange }: { onChange: (chatId: string) => void }) {
	const { chatId } = useAgentContext();
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	useEffect(() => {
		if (chatId) {
			onChangeRef.current(chatId);
		}
	}, [chatId]);
	return null;
}

function QueryWorkbenchLayout({
	projectId,
	savedTool,
	draft,
	update,
	onSaved,
	onNewDraft,
	onBack,
	onNewConversation,
}: {
	projectId: string;
	savedTool?: ProjectQueryTool;
	draft: ReturnType<typeof useWorkbenchDraft>['draft'];
	update: ReturnType<typeof useWorkbenchDraft>['update'];
	onSaved: (toolId: string) => void;
	onNewDraft: () => void;
	onBack: () => void;
	onNewConversation: () => void;
}) {
	const { createMutation, updateMutation, previewMutation } = useQueryToolMutations();
	const connections = useApolloQuery(WarehouseConnectionsDocument);
	const { queueOrSendMessage } = useAgentContext();
	const [result, setResult] = useState<QueryToolPreview | null>(null);
	const [isSchemaOpen, setIsSchemaOpen] = useState(false);
	const [mobilePane, setMobilePane] = useState<MobilePane>('editor');
	const [saveDialog, setSaveDialog] = useState<SaveDialog>(null);
	const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

	const { sql, parameters, values, databaseId } = draft;
	const connectionNames = connections.data?.warehouseConnections.map((connection) => connection.name) ?? [];
	const hasNoConnection = !connections.loading && !connections.error && connectionNames.length === 0;
	const placeholders = useMemo(() => extractQueryToolPlaceholders(sql), [sql]);
	const canRun = Boolean(sql.trim()) && !hasNoConnection && !previewMutation.isPending;
	const hasChanges = Boolean(savedTool && sql !== savedTool.sqlTemplate);
	const canUpdate = Boolean(savedTool?.canEdit);

	const run = () => {
		const current = editorRef.current?.getValue() ?? sql;
		if (!current.trim() || hasNoConnection) {
			return;
		}
		previewMutation.mutate(
			{
				sqlTemplate: current,
				parameters,
				values: Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '')),
				databaseId,
			},
			{ onSuccess: setResult },
		);
	};

	const insertInEditor = (text: string) => {
		const instance = editorRef.current;
		const selection = instance?.getSelection();
		if (instance && selection) {
			instance.executeEdits('workbench-schema', [{ range: selection, text, forceMoveMarkers: true }]);
			instance.focus();
			return;
		}
		update({ sql: sql ? `${sql} ${text}` : text });
	};

	const applySql = useCallback(
		(nextSql: string, nextDatabaseId?: string) => {
			update({ sql: nextSql, ...(nextDatabaseId !== undefined && { databaseId: nextDatabaseId }) });
			setMobilePane('editor');
		},
		[update],
	);
	const workbench = useMemo(() => ({ sql, applySql }), [sql, applySql]);

	const askToFix = () => {
		const message = previewMutation.error?.message ?? '';
		setMobilePane('assistant');
		void queueOrSendMessage({ text: `This query failed. Please fix it.\n\nError: ${message}` });
	};

	const saveNew = async (details: QueryToolDetails) => {
		const created = await createMutation.mutateAsync({ ...details, sqlTemplate: sql, parameters, databaseId });
		if (!savedTool) {
			clearStoredDraft(projectId, NEW_TOOL_KEY);
		}
		setSaveDialog(null);
		onSaved(created.id);
	};

	const saveUpdate = async (details: QueryToolDetails) => {
		if (!savedTool) {
			return;
		}
		await updateMutation.mutateAsync({ id: savedTool.id, ...details, sqlTemplate: sql, parameters, databaseId });
		setSaveDialog(null);
	};

	const savedDetails: QueryToolDetails | undefined = savedTool && {
		name: savedTool.name,
		description: savedTool.description,
		enabled: savedTool.enabled,
	};

	return (
		<QueryWorkbenchContext.Provider value={workbench}>
			<div className={styles.workbench} data-testid='query-workbench'>
				<header className={styles.header}>
					<Button variant='ghost-muted' size='icon-sm' onClick={onBack} aria-label='Back to query tools'>
						<ArrowLeft />
					</Button>
					<h1 className={styles.title}>{savedTool?.agentToolName ?? 'New query'}</h1>
					{hasChanges && (
						<>
							<span className={styles.mutedText}>Unsaved changes</span>
							<Button
								variant='ghost-muted'
								size='sm'
								onClick={() =>
									savedTool &&
									update({
										sql: savedTool.sqlTemplate,
										parameters: savedTool.parameters,
										databaseId: savedTool.databaseId ?? null,
									})
								}
							>
								Discard changes
							</Button>
						</>
					)}
					<Button variant='ghost-muted' size='sm' className={styles.headerEnd} onClick={onNewDraft}>
						<FilePlus />
						New draft
					</Button>
				</header>

				<div className={styles.mobileTabs}>
					<TabBar<MobilePane>
						idBase='query-workbench'
						activeTab={mobilePane}
						onTabChange={setMobilePane}
						tabs={[
							{ id: 'editor', label: 'Editor' },
							{ id: 'assistant', label: 'Assistant' },
						]}
					/>
				</div>

				<div className={styles.panes}>
					<div className={cn(styles.assistantPane, mobilePane !== 'assistant' && styles.paneHiddenOnMobile)}>
						<WorkbenchAssistant isDisabled={hasNoConnection} onNewConversation={onNewConversation} />
					</div>

					<div className={cn(styles.editorPane, mobilePane !== 'editor' && styles.paneHiddenOnMobile)}>
						{connections.loading ? (
							<Skeleton className={styles.resultsSkeleton} />
						) : connections.error ? (
							<ErrorMessage message={connections.error.message} />
						) : hasNoConnection ? (
							<Empty>
								No warehouse connected.{' '}
								<Link to='/settings/project/warehouse'>Connect a warehouse</Link> to run queries.
							</Empty>
						) : (
							<>
								<div className={styles.toolbar}>
									<label className={styles.connection}>
										<span className={styles.mutedText}>Connection</span>
										<Select
											value={databaseId ?? DEFAULT_CONNECTION}
											onValueChange={(value) =>
												update({ databaseId: value === DEFAULT_CONNECTION ? null : value })
											}
										>
											<SelectTrigger className={styles.connectionTrigger}>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value={DEFAULT_CONNECTION}>Default connection</SelectItem>
												{connectionNames.map((connection) => (
													<SelectItem key={connection} value={connection}>
														{connection}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</label>
									<Button
										variant='ghost-muted'
										size='sm'
										onClick={() => setIsSchemaOpen(!isSchemaOpen)}
										aria-pressed={isSchemaOpen}
									>
										<TableProperties />
										Schema
									</Button>
									<div className={styles.toolbarEnd}>
										<Button variant='outline' size='sm' onClick={run} disabled={!canRun}>
											<Play />
											Run
										</Button>
										{canUpdate ? (
											<>
												<Button
													size='sm'
													onClick={() =>
														savedDetails &&
														void saveUpdate(savedDetails).catch(() => undefined)
													}
													disabled={!sql.trim() || !hasChanges || updateMutation.isPending}
												>
													<Save />
													{hasChanges ? 'Update' : 'Saved'}
												</Button>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															size='icon-sm'
															variant='outline'
															aria-label='More save options'
														>
															<ChevronDown />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align='end'>
														<DropdownMenuItem onSelect={() => setSaveDialog('details')}>
															Edit details
														</DropdownMenuItem>
														<DropdownMenuItem onSelect={() => setSaveDialog('create')}>
															Save as new tool
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</>
										) : (
											<Button
												size='sm'
												onClick={() => setSaveDialog('create')}
												disabled={!sql.trim()}
											>
												<Save />
												{savedTool ? 'Save as new tool' : 'Save as tool'}
											</Button>
										)}
									</div>
								</div>
								{updateMutation.error && !saveDialog && (
									<ErrorMessage message={updateMutation.error.message} />
								)}

								<div className={styles.editorArea}>
									{isSchemaOpen && (
										<aside className={styles.schemaPane}>
											<WorkbenchSchema onInsert={insertInEditor} />
										</aside>
									)}
									<div className={styles.editorColumn}>
										<div className={styles.editor}>
											<QueryToolSqlEditor
												value={sql}
												onChange={(next) => update({ sql: next })}
												onRun={run}
												onReady={(instance) => {
													editorRef.current = instance;
												}}
											/>
										</div>
										{(placeholders.length > 0 || parameters.length > 0) && (
											<div className={styles.parameters}>
												<QueryToolParameters
													parameters={parameters}
													values={values}
													onChange={(next) => update({ parameters: next })}
													onValuesChange={(next) => update({ values: next })}
													placeholders={placeholders}
												/>
											</div>
										)}
									</div>
								</div>

								<div className={styles.results}>
									<WorkbenchResults
										result={result}
										error={previewMutation.error?.message}
										isRunning={previewMutation.isPending}
										onAskToFix={askToFix}
									/>
								</div>
							</>
						)}
					</div>
				</div>
			</div>

			{saveDialog === 'create' && (
				<SaveQueryToolDialog
					title='Save as query tool'
					initial={{ name: '', description: savedTool?.description ?? '', enabled: true }}
					submitLabel='Save tool'
					isPending={createMutation.isPending}
					error={createMutation.error?.message}
					onClose={() => setSaveDialog(null)}
					onSubmit={(details) => void saveNew(details).catch(() => undefined)}
				/>
			)}
			{saveDialog === 'details' && savedDetails && (
				<SaveQueryToolDialog
					title='Edit details'
					initial={savedDetails}
					submitLabel='Save changes'
					isPending={updateMutation.isPending}
					error={updateMutation.error?.message}
					onClose={() => setSaveDialog(null)}
					onSubmit={(details) => void saveUpdate(details).catch(() => undefined)}
				/>
			)}
		</QueryWorkbenchContext.Provider>
	);
}
