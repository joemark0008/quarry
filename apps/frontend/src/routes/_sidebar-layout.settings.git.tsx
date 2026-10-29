import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { DeploymentManagedGitSettings } from '@/components/settings/deployment-managed-git-settings';
import { LiveContextUpdateSettings } from '@/components/settings/live-context-update-settings';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/ui/error-message';
import { SettingsCard, SettingsPageWrapper } from '@/components/ui/settings-card';
import { Spinner } from '@/components/ui/spinner';
import { usePermissions } from '@/hooks/use-permissions';
import { requireContextAdminOrAdmin } from '@/lib/route-guards';
import { contextExplorerApi } from '@/lib/context-explorer-api';

export const Route = createFileRoute('/_sidebar-layout/settings/git')({
	beforeLoad: requireContextAdminOrAdmin,
	component: GitSettingsPage,
});

/**
 * The context files repository configured for the deployment (`QUARRY_CONTEXT_SOURCE=git`). Connecting GitHub or
 * GitLab accounts from this page comes back with Phase 7 (docs/deferred-features.md).
 */
function GitSettingsPage() {
	const { isAdmin } = usePermissions();
	const repositoryStatus = useQuery(contextExplorerApi.contextExplorer.getRepositoryStatus.queryOptions());
	const status = repositoryStatus.data;

	return (
		<SettingsPageWrapper>
			<div className='flex flex-col gap-5'>
				<div>
					<h1 className='text-lg font-semibold text-foreground'>Git</h1>
					<p className='text-sm text-muted-foreground'>
						The repository used to edit context files and keep live context up to date.
					</p>
				</div>
				<div className='flex flex-col gap-12'>
					{repositoryStatus.isLoading ? (
						<div className='flex items-center justify-center py-10'>
							<Spinner />
						</div>
					) : repositoryStatus.error ? (
						<div className='flex flex-col items-start gap-2'>
							<ErrorMessage message={repositoryStatus.error.message} />
							<Button size='sm' variant='outline' onClick={() => void repositoryStatus.refetch()}>
								Retry
							</Button>
						</div>
					) : status?.managedByContextSource ? (
						<DeploymentManagedGitSettings
							contextSource={status.contextSource}
							configurationError={status.liveContextUpdate.configurationError}
						/>
					) : (
						<SettingsCard title='Context files repository'>
							<p className='text-sm text-muted-foreground'>
								No repository is configured. Set <code>QUARRY_CONTEXT_SOURCE=git</code> and{' '}
								<code>QUARRY_CONTEXT_GIT_URL</code> (with <code>QUARRY_CONTEXT_GIT_TOKEN</code> or{' '}
								<code>QUARRY_CONTEXT_GIT_SSH_KEY</code> to allow edits) on the API to keep context files
								in Git.
							</p>
						</SettingsCard>
					)}
					{status?.liveContextUpdate.enabled && (
						<LiveContextUpdateSettings
							status={status.liveContextUpdate}
							repository={status.liveContextRepository}
							isAdmin={isAdmin}
						/>
					)}
				</div>
			</div>
		</SettingsPageWrapper>
	);
}
