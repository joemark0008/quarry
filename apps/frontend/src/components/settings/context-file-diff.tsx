import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FilePen } from 'lucide-react';

import { FileDiffBody } from '@/components/settings/file-diff';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { computeLineDiff } from '@/lib/line-diff';
import { getApiErrorCode } from '@/lib/api-error';
import { contextExplorerApi } from '@/lib/context-explorer-api';
import styles from './context-file-diff.module.css';

interface ContextFileDiffProps {
	path: string;
	range?: { from: string; to: string };
}

export function ContextFileDiff({ path, range }: ContextFileDiffProps) {
	const fileDiff = useQuery(
		contextExplorerApi.contextExplorer.getFileDiff.queryOptions(
			range ? { path, from: range.from, to: range.to } : { path },
		),
	);
	const diff = useMemo(
		() => (fileDiff.data ? computeLineDiff(fileDiff.data.oldContent, fileDiff.data.newContent) : null),
		[fileDiff.data],
	);

	if (fileDiff.isLoading) {
		return (
			<div className={styles.contextFileDiffDiv}>
				<Spinner />
			</div>
		);
	}

	if (fileDiff.isError && getApiErrorCode(fileDiff.error) === 'BAD_REQUEST') {
		return (
			<div className={styles.contextFileDiffDiv2}>
				<p>{range ? 'This historical change is unavailable.' : 'This file no longer has changes.'}</p>
			</div>
		);
	}

	if (fileDiff.isError || !fileDiff.data || !diff) {
		return (
			<div className={styles.contextFileDiffDiv3}>
				<p>Failed to load changes</p>
				<Button variant='outline' size='sm' onClick={() => fileDiff.refetch()}>
					Retry
				</Button>
			</div>
		);
	}

	return (
		<div className={styles.contextFileDiffDiv4}>
			<div className={styles.contextFileDiffDiv5}>
				<FilePen className={styles.contextFileDiffFilePen} />
				<span className={styles.contextFileDiffSpan} title={path}>
					{path}
				</span>
				<span className={styles.contextFileDiffSpan2}>{getChangeLabel(fileDiff.data.kind)}</span>
				<span className={styles.contextFileDiffSpan3}>+{diff.additions}</span>
				<span className={styles.contextFileDiffSpan4}>-{diff.deletions}</span>
			</div>
			<div className={styles.contextFileDiffDiv6}>
				<FileDiffBody lines={diff.lines} />
			</div>
		</div>
	);
}

function getChangeLabel(kind: 'modified' | 'untracked' | 'deleted'): string {
	if (kind === 'untracked') {
		return 'New file';
	}
	if (kind === 'deleted') {
		return 'Removed';
	}
	return 'Edited';
}
