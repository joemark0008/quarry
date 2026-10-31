import { useQuery } from '@tanstack/react-query';
import styles from './git-page.module.css';
import { DeploymentManagedGitSettings } from '@/feature/settings/components/deployment-managed-git-settings';
import { LiveContextUpdateSettings } from '@/feature/settings/components/live-context-update-settings';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/ui/error-message';
import { SettingsCard, SettingsPageWrapper } from '@/components/ui/settings-card';
import { Spinner } from '@/components/ui/spinner';
import { usePermissions } from '@/hooks/use-permissions';
import { contextExplorerApi } from '@/lib/context-explorer-api';

/**
 * The context files repository configured for the deployment (`QUARRY_CONTEXT_SOURCE=git`). Connecting GitHub or
 * GitLab accounts from this page comes back with Phase 7 (docs/deferred-features.md).
 */
export function GitSettingsPage() {
	const { isAdmin } = usePermissions();
	const repositoryStatus = useQuery(contextExplorerApi.contextExplorer.getRepositoryStatus.queryOptions());
	const status = repositoryStatus.data;

	return (
		<SettingsPageWrapper>
			<div className={styles.gitSettingsPageDiv}>
				<div>
					<h1 className={styles.gitSettingsPageH1}>Git</h1>
					<p className={styles.gitSettingsPageP}>
						The repository used to edit context files and keep live context up to date.
					</p>
				</div>
				<div className={styles.gitSettingsPageDiv2}>
					{repositoryStatus.isLoading ? (
						<div className={styles.gitSettingsPageDiv3}>
							<Spinner />
						</div>
					) : repositoryStatus.error ? (
						<div className={styles.gitSettingsPageDiv4}>
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
							<p className={styles.gitSettingsPageP}>
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
