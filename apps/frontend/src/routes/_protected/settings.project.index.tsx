import { createFileRoute } from '@tanstack/react-router';

import { EditableProjectName } from '@/components/settings/editable-project-name';
import { ProjectIdentifier } from '@/components/settings/project-identifier';
import { SettingsCard } from '@/components/ui/settings-card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import { useCurrentProject } from '@/hooks/use-current-project';
import styles from './settings.project.index.module.css';

export const Route = createFileRoute('/_protected/settings/project/')({
	staticData: {
		title: 'Project Settings',
	},
	component: ProjectSettingsPage,
});

function ProjectSettingsPage() {
	const project = useCurrentProject();
	const { isAdmin } = usePermissions();

	return (
		<>
			<SettingsCard title='Information'>
				{project.isLoading ? (
					<>
						<DetailRow label='Name' value={<Skeleton className={styles.projectSettingsPageSkeleton} />} />
						<DetailRow label='Path' value={<Skeleton className={styles.projectSettingsPageSkeleton2} />} />
						<DetailRow label='Project ID' value={<Skeleton className={styles.projectSettingsPageSkeleton3} />} />
					</>
				) : project.data ? (
					<>
						<DetailRow
							label='Name'
							value={
								<EditableProjectName
									key={project.data.id}
									projectId={project.data.id}
									name={project.data.name}
									canEdit={isAdmin}
								/>
							}
						/>
						{project.data.path && (
							<DetailRow
								label='Path'
								value={<code className={styles.projectSettingsPageCode}>{project.data.path}</code>}
							/>
						)}
						<DetailRow label='Project ID' value={<ProjectIdentifier projectId={project.data.id} />} />
					</>
				) : null}
			</SettingsCard>
		</>
	);
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className={styles.detailRowDiv}>
			<span className={styles.detailRowSpan}>{label}</span>
			<div className={styles.detailRowDiv2}>{value}</div>
		</div>
	);
}
