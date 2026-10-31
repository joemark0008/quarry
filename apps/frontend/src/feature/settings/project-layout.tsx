import { Outlet, useMatches } from '@tanstack/react-router';
import { SettingsCard, SettingsPageWrapper } from '@/components/ui/settings-card';
import { Empty } from '@/components/ui/empty';
import { useCurrentProject } from '@/hooks/use-current-project';
import styles from './project-layout.module.css';


declare module '@tanstack/react-router' {
	interface StaticDataRouteOption {
		title?: string;
		description?: string;
	}
}

export function ProjectPage() {
	const project = useCurrentProject();
	const pageHeader = useMatches().at(-1)?.staticData;
	const emptyMessage = 'No project selected. Create one with New project in the project switcher.';

	return (
		<SettingsPageWrapper>
			<div className={styles.projectPageDiv}>
				{pageHeader?.title && (
					<div>
						<h1 className={styles.projectPageH1}>{pageHeader.title}</h1>
						{pageHeader.description && (
							<p className={styles.projectPageP}>{pageHeader.description}</p>
						)}
					</div>
				)}
				<div className={styles.projectPageDiv2}>
					{project.data ? (
						<Outlet />
					) : (
						<SettingsCard>
							<Empty>{emptyMessage}</Empty>
						</SettingsCard>
					)}
				</div>
			</div>
		</SettingsPageWrapper>
	);
}
