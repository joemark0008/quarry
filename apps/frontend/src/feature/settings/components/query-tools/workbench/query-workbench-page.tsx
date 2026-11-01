import { useState } from 'react';
import styles from './query-workbench.module.css';
import { clearStoredDraft } from './use-workbench-draft';
import { QueryWorkbench } from './query-workbench';
import { Button } from '@/components/ui/button';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentProject } from '@/hooks/use-current-project';
import { useQueryToolsQuery } from '@/queries/use-query-tools';

/** Resolves `?tool=` to a saved tool, or a new draft. The workbench keeps its state when a new draft gets saved. */
export function QueryWorkbenchPage({
	toolParam,
	initialSql,
	onOpenTool,
	onOpenNew,
	onBack,
}: {
	toolParam: string;
	initialSql?: string;
	onOpenTool: (toolId: string) => void;
	onOpenNew: () => void;
	onBack: () => void;
}) {
	const project = useCurrentProject();
	const tools = useQueryToolsQuery();
	const [generation, setGeneration] = useState(0);
	const isNew = toolParam === 'new';
	const savedTool = isNew ? undefined : tools.data?.find((tool) => tool.id === toolParam);

	if (!project.data || (!isNew && tools.isLoading)) {
		return <Skeleton className={styles.resultsSkeleton} />;
	}
	if (!isNew && !savedTool) {
		return (
			<Empty>
				This query tool no longer exists.{' '}
				<Button variant='ghost-muted' size='sm' onClick={onBack}>
					Back to query tools
				</Button>
			</Empty>
		);
	}

	const projectId = project.data.id;
	return (
		<QueryWorkbench
			key={generation}
			projectId={projectId}
			savedTool={savedTool}
			initialSql={initialSql}
			onSaved={onOpenTool}
			onNewDraft={() => {
				clearStoredDraft(projectId, 'new');
				setGeneration((current) => current + 1);
				onOpenNew();
			}}
			onBack={onBack}
		/>
	);
}
