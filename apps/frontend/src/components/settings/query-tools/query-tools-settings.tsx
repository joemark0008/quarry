import { Pencil, Plus, TerminalSquare, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { QueryToolEditor } from './query-tool-editor';
import type { ProjectQueryTool } from '@/lib/api-types';

import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Empty } from '@/components/ui/empty';
import { ErrorMessage } from '@/components/ui/error-message';
import { SettingsCard } from '@/components/ui/settings-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import { useQueryToolMutations, useQueryToolsQuery } from '@/queries/use-query-tools';

type EditorState = { mode: 'create'; sql?: string } | { mode: 'edit'; tool: ProjectQueryTool } | null;

/** Settings → Project → Query tools: the project's saved queries the agent can call. */
export function QueryToolsSettings({
	initialSql,
	onInitialSqlUsed,
}: {
	initialSql?: string;
	onInitialSqlUsed?: () => void;
}) {
	const tools = useQueryToolsQuery();
	const { updateMutation, deleteMutation } = useQueryToolMutations();
	const { canSendMessages } = usePermissions();
	const [editor, setEditor] = useState<EditorState>(initialSql ? { mode: 'create', sql: initialSql } : null);
	const [toolToDelete, setToolToDelete] = useState<ProjectQueryTool | null>(null);

	const closeEditor = () => {
		setEditor(null);
		onInitialSqlUsed?.();
	};

	if (editor) {
		return (
			<QueryToolEditor
				key={editor.mode === 'edit' ? editor.tool.id : 'new'}
				tool={editor.mode === 'edit' ? editor.tool : undefined}
				initialSql={editor.mode === 'create' ? editor.sql : undefined}
				onDone={closeEditor}
			/>
		);
	}

	return (
		<SettingsCard
			title='Saved query tools'
			description='Named SQL queries the agent can call in chat.'
			action={
				canSendMessages && (
					<Button size='sm' onClick={() => setEditor({ mode: 'create' })}>
						<Plus />
						New query tool
					</Button>
				)
			}
			divide
		>
			{tools.isLoading ? (
				<div className='flex flex-col gap-3'>
					<Skeleton className='h-8 w-full' />
					<Skeleton className='h-8 w-full' />
				</div>
			) : tools.isError ? (
				<ErrorMessage message={tools.error.message} />
			) : !tools.data?.length ? (
				<Empty>No query tools yet. Build a query and save it as a tool the agent can call.</Empty>
			) : (
				<div className='flex flex-col divide-y'>
					{tools.data.map((tool) => (
						<div key={tool.id} className='flex items-center gap-4 py-2 group first:pt-0 last:pb-0'>
							<div className='flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground'>
								<TerminalSquare className='size-4' />
							</div>
							<div className='flex-1 min-w-0'>
								<div className='flex items-baseline gap-2 min-w-0'>
									<span className='text-sm font-medium font-mono text-foreground truncate'>
										{tool.agentToolName}
									</span>
									{tool.parameters.length > 0 && (
										<span className='text-xs text-muted-foreground truncate'>
											({tool.parameters.map((parameter) => parameter.name).join(', ')})
										</span>
									)}
								</div>
								<p className='text-xs text-muted-foreground truncate'>{tool.description}</p>
							</div>
							<Switch
								checked={tool.enabled}
								disabled={!tool.canEdit || updateMutation.isPending}
								onCheckedChange={(enabled) => updateMutation.mutate({ id: tool.id, enabled })}
								aria-label={`${tool.name} available to the agent`}
							/>
							<div
								className={cn(
									'flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity',
									!tool.canEdit && 'invisible',
								)}
							>
								<Button
									variant='ghost-muted'
									size='icon-sm'
									onClick={() => setEditor({ mode: 'edit', tool })}
									aria-label={`Edit ${tool.name}`}
								>
									<Pencil />
								</Button>
								<Button
									variant='ghost-muted'
									size='icon-sm'
									onClick={() => {
										deleteMutation.reset();
										setToolToDelete(tool);
									}}
									aria-label={`Delete ${tool.name}`}
								>
									<Trash2 />
								</Button>
							</div>
						</div>
					))}
				</div>
			)}
			{updateMutation.error && <ErrorMessage message={updateMutation.error.message} />}

			<ConfirmationDialog
				open={!!toolToDelete}
				onOpenChange={(open) => !open && setToolToDelete(null)}
				title='Delete query tool?'
				description={`The agent will no longer be able to call ${toolToDelete?.agentToolName ?? 'this tool'}. Past chat results stay.`}
				confirmLabel='Delete'
				onConfirm={() => {
					if (toolToDelete) {
						deleteMutation.mutate({ id: toolToDelete.id }, { onSuccess: () => setToolToDelete(null) });
					}
				}}
				isPending={deleteMutation.isPending}
				error={deleteMutation.error?.message}
			/>
		</SettingsCard>
	);
}
