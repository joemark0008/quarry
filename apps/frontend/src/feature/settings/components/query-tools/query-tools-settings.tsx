import { Pencil, Plus, TerminalSquare, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CopyToolNameButton } from './copy-tool-name-button';
import styles from './query-tools-settings.module.css';
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

/** Settings → Project → Query tools: the project's saved queries the agent can call. */
export function QueryToolsSettings({ onOpen }: { onOpen: (tool: string) => void }) {
	const tools = useQueryToolsQuery();
	const { updateMutation, deleteMutation } = useQueryToolMutations();
	const { canSendMessages } = usePermissions();
	const [toolToDelete, setToolToDelete] = useState<ProjectQueryTool | null>(null);

	return (
		<SettingsCard
			title='Saved query tools'
			description='Named SQL queries the agent can call in chat.'
			action={
				canSendMessages && (
					<Button size='sm' onClick={() => onOpen('new')}>
						<Plus />
						New query
					</Button>
				)
			}
			divide
		>
			{tools.isLoading ? (
				<div className={styles.queryToolsSettingsDiv}>
					<Skeleton className={styles.queryToolsSettingsSkeleton} />
					<Skeleton className={styles.queryToolsSettingsSkeleton} />
				</div>
			) : tools.isError ? (
				<ErrorMessage message={tools.error.message} />
			) : !tools.data?.length ? (
				<Empty>No query tools yet. Write a query, run it and save it as a tool the agent can call.</Empty>
			) : (
				<div className={styles.queryToolsSettingsDiv2}>
					{tools.data.map((tool) => (
						<div key={tool.id} className={`${styles.queryToolsSettingsDiv3} group`}>
							<div className={styles.queryToolsSettingsDiv4}>
								<TerminalSquare className={styles.queryToolsSettingsTerminalSquare} />
							</div>
							<div className={styles.queryToolsSettingsDiv5}>
								<div className={styles.queryToolsSettingsDiv6}>
									<span className={styles.queryToolsSettingsSpan}>{tool.agentToolName}</span>
									<CopyToolNameButton name={tool.agentToolName} />
									{tool.parameters.length > 0 && (
										<span className={styles.queryToolsSettingsSpan2}>
											({tool.parameters.map((parameter) => parameter.name).join(', ')})
										</span>
									)}
								</div>
								<p className={styles.queryToolsSettingsSpan2}>{tool.description}</p>
							</div>
							<Switch
								checked={tool.enabled}
								disabled={!tool.canEdit || updateMutation.isPending}
								onCheckedChange={(enabled) => updateMutation.mutate({ id: tool.id, enabled })}
								aria-label={`${tool.name} available to the agent`}
							/>
							<div
								className={cn(
									styles.queryToolsSettingsDiv7,
									!tool.canEdit && styles.queryToolsSettingsDiv8,
								)}
							>
								<Button
									variant='ghost-muted'
									size='icon-sm'
									onClick={() => onOpen(tool.id)}
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
