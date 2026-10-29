import { GitBranch } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/ui/error-message';
import { SettingsCard } from '@/components/ui/settings-card';

interface DeploymentContextSource {
	repositoryUrl: string | null;
	platform: 'github' | 'gitlab' | 'bitbucket' | null;
	branch: string | null;
	subpath: string | null;
	authMethod: 'token' | 'ssh-key' | 'public';
}

interface DeploymentManagedGitSettingsProps {
	contextSource: DeploymentContextSource | null;
	configurationError: string | null;
}

const AUTH_METHOD_LABELS: Record<DeploymentContextSource['authMethod'], string> = {
	token: 'Access token',
	'ssh-key': 'SSH deploy key',
	public: 'Public repository',
};

export function DeploymentManagedGitSettings({ contextSource, configurationError }: DeploymentManagedGitSettingsProps) {
	const repositoryUrl = contextSource?.repositoryUrl ?? null;
	const secondaryFacts = contextSource ? getSecondaryFacts(contextSource) : [];

	return (
		<SettingsCard
			title='Deployment repository'
			icon={<GitBranch className='size-4' />}
			description={getDescription(contextSource?.authMethod)}
			action={
				repositoryUrl && isHttpUrl(repositoryUrl) ? (
					<Button size='sm' variant='primary-gradient' asChild>
						<a href={repositoryUrl} target='_blank' rel='noreferrer'>
							Open repository
						</a>
					</Button>
				) : undefined
			}
			className='gap-6 p-6'
		>
			<div className='min-w-0'>
				<div className='truncate font-mono text-base font-medium text-foreground'>
					{repositoryUrl ? getRepositoryName(repositoryUrl) : 'Repository unavailable'}
				</div>
				{secondaryFacts.length > 0 && (
					<div className='mt-1 truncate text-sm text-muted-foreground'>{secondaryFacts.join(' · ')}</div>
				)}
				{configurationError && (
					<div className='mt-3'>
						<ErrorMessage message={configurationError} />
					</div>
				)}
				{contextSource?.authMethod === 'public' && (
					<p className='mt-2 text-xs text-muted-foreground'>
						Context files are read-only because no access token or SSH deploy key is configured.
					</p>
				)}
			</div>
		</SettingsCard>
	);
}

function getDescription(authMethod: DeploymentContextSource['authMethod'] | undefined): string {
	if (authMethod === 'public') {
		return 'File Explorer reads context files from this public repository. Add an access token or SSH deploy key to enable editing.';
	}
	return "File Explorer commits and review requests use this repository with the deployment's shared credential.";
}

function getSecondaryFacts(contextSource: DeploymentContextSource): string[] {
	return [
		contextSource.branch ? `Branch ${contextSource.branch}` : null,
		AUTH_METHOD_LABELS[contextSource.authMethod],
		contextSource.subpath ? `Subpath ${contextSource.subpath}` : null,
	].filter((fact): fact is string => fact !== null);
}

function getRepositoryName(repositoryUrl: string): string {
	if (!isHttpUrl(repositoryUrl)) {
		return repositoryUrl;
	}
	try {
		const pathname = new URL(repositoryUrl).pathname.replace(/\/+$/, '').replace(/\.git$/i, '');
		const segments = pathname.split('/').filter(Boolean);
		return segments.join('/') || repositoryUrl;
	} catch {
		return repositoryUrl;
	}
}

function isHttpUrl(value: string): boolean {
	return /^https?:\/\//i.test(value);
}
