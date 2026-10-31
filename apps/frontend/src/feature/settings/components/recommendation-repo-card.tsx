import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { GitBranch, Github } from 'lucide-react';

import styles from './recommendation-repo-card.module.css';
import type { RepoProvider } from '@quarry/shared/types';

import GitlabIcon from '@/components/icons/gitlab-icon.svg';
import { Button } from '@/components/ui/button';
import { SettingsCard } from '@/components/ui/settings-card';
import { Skeleton } from '@/components/ui/skeleton';
import { contextRecommendationApi } from '@/lib/context-recommendation-api';

export function RecommendationRepoCard() {
	const repo = useQuery({
		...contextRecommendationApi.contextRecommendation.getRepo.queryOptions(),
		staleTime: 30_000,
	});
	const linkedRepos = useQuery({
		...contextRecommendationApi.contextRecommendation.listLinkedRepos.queryOptions(),
		staleTime: 30_000,
	});

	if (repo.isLoading) {
		return (
			<SettingsCard title='Repository' icon={<Github className={styles.recommendationRepoCardGithub} />}>
				<Skeleton className={styles.recommendationRepoCardSkeleton} />
			</SettingsCard>
		);
	}

	if (!repo.data) {
		return (
			<SettingsCard
				title='Repository'
				icon={<Github className={styles.recommendationRepoCardGithub} />}
				description='Connect a context repository on the Git settings page so recommendations can include proposed changes.'
				action={<GitSettingsLink label='Open Git settings' />}
			>
				<LinkedReposList repos={linkedRepos.data ?? []} />
			</SettingsCard>
		);
	}

	const { repoFullName, branch, provider, webUrl } = repo.data;
	const ProviderIcon = provider === 'gitlab' ? GitlabIcon : Github;

	return (
		<SettingsCard
			title='Repository'
			icon={<ProviderIcon className={styles.recommendationRepoCardGithub} />}
			description='Pull requests with drafted context changes are opened against this repository.'
			action={<GitSettingsLink label='Manage in Git settings' />}
		>
			<div className={styles.recommendationRepoCardDiv}>
				<a href={webUrl} target='_blank' rel='noopener noreferrer' className={styles.recommendationRepoCardA}>
					{repoFullName}
				</a>
				{branch && (
					<span className={styles.recommendationRepoCardSpan}>
						<GitBranch className={styles.recommendationRepoCardGitBranch} />
						{branch}
					</span>
				)}
			</div>
			<LinkedReposList repos={linkedRepos.data ?? []} />
		</SettingsCard>
	);
}

function GitSettingsLink({ label }: { label: string }) {
	return (
		<Button size='sm' variant='outline' asChild>
			<Link to='/settings/git'>{label}</Link>
		</Button>
	);
}

interface LinkedRepo {
	name: string;
	contextPath: string;
	repoFullName: string | null;
	branch: string | null;
	url: string | null;
	localPath: string | null;
	provider: RepoProvider | null;
}

function LinkedReposList({ repos }: { repos: LinkedRepo[] }) {
	if (repos.length === 0) {
		return null;
	}
	return (
		<div className={styles.linkedReposListDiv}>
			<div className={styles.linkedReposListDiv2}>Linked repos from quarry_config.yaml</div>
			<div className={styles.linkedReposListDiv3}>
				{repos.map((repo) => (
					<div key={repo.name} className={styles.linkedReposListDiv4}>
						<span className={styles.linkedReposListSpan}>{repo.contextPath}/</span>
						<span className={styles.linkedReposListSpan2}>→</span>
						{repo.repoFullName && repo.url ? (
							<a
								href={repo.url}
								target='_blank'
								rel='noopener noreferrer'
								className={styles.recommendationRepoCardA}
							>
								{repo.repoFullName}
							</a>
						) : (
							<span className={styles.linkedReposListSpan}>
								{repo.localPath ?? repo.url ?? 'unlinked'}
							</span>
						)}
						{repo.branch && (
							<span className={styles.linkedReposListSpan3}>
								<GitBranch className={styles.recommendationRepoCardGitBranch} />
								{repo.branch}
							</span>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
