import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { useRef } from 'react';
import styles from './appearance-page.module.css';
import type { TabBarItem } from '@/components/ui/tab-bar';
import { DateFormatSection } from '@/feature/settings/components/date-format-section';
import { StoryThemeEditorProvider } from '@/feature/settings/components/story-theme-editor-context';
import { StoryThemeSettings } from '@/feature/settings/components/story-theme-settings';
import { SidePanel } from '@/feature/stories/components/side-panel/side-panel';
import { SettingsPageWrapper } from '@/components/ui/settings-card';
import { TabBar, TabPanel } from '@/components/ui/tab-bar';
import { SidePanelProvider } from '@/contexts/side-panel';
import { usePermissions } from '@/hooks/use-permissions';
import { useSidePanel } from '@/hooks/use-side-panel';
import { useCurrentProject } from '@/hooks/use-current-project';

const Route = getRouteApi('/_protected/settings/appearance');

export type AppearanceTab = 'general' | 'stories';

const tabs: TabBarItem<AppearanceTab>[] = [
	{ id: 'general', label: 'General' },
	{ id: 'stories', label: 'Stories' },
];

const tabIdBase = 'appearance';

export function AppearancePage() {
	const { tab } = Route.useSearch();
	const navigate = useNavigate({ from: '/settings/appearance' });
	const { isAdmin } = usePermissions();
	const project = useCurrentProject();
	const containerRef = useRef<HTMLDivElement>(null);
	const sidePanelRef = useRef<HTMLDivElement>(null);
	const sidePanel = useSidePanel({
		containerRef,
		sidePanelRef,
		defaultWidthRatio: 0.5,
		shouldCollapseSidebar: false,
	});

	return (
		<StoryThemeEditorProvider key={project.data?.id}>
			<SidePanelProvider
				isVisible={sidePanel.isVisible}
				currentStorySlug={sidePanel.currentStorySlug}
				setCurrentStorySlug={sidePanel.setCurrentStorySlug}
				currentStoryTabIndex={sidePanel.currentStoryTabIndex}
				setCurrentStoryTabIndex={sidePanel.setCurrentStoryTabIndex}
				chatId={null}
				open={sidePanel.open}
				close={sidePanel.close}
			>
				<div ref={containerRef} className={styles.appearancePageDiv}>
					<SettingsPageWrapper>
						<div className={styles.appearancePageDiv2}>
							<h1 className={styles.appearancePageH1}>Appearance</h1>
							<TabBar
								tabs={tabs}
								activeTab={tab}
								onTabChange={(nextTab) => {
									navigate({ search: { tab: nextTab }, replace: true });
								}}
								idBase={tabIdBase}
								className={styles.appearancePageTabBar}
							/>
							<TabPanel idBase={tabIdBase} tabId={tab} className={styles.appearancePageTabPanel}>
								{tab === 'general' && <GeneralSettings isAdmin={isAdmin} />}
								{tab === 'stories' && <StoryThemeSettings isAdmin={isAdmin} />}
							</TabPanel>
						</div>
					</SettingsPageWrapper>
					{sidePanel.content && (
						<SidePanel
							containerRef={containerRef}
							isAnimating={sidePanel.isAnimating}
							sidePanelRef={sidePanelRef}
							resizeHandleRef={sidePanel.resizeHandleRef}
						>
							{sidePanel.content}
						</SidePanel>
					)}
				</div>
			</SidePanelProvider>
		</StoryThemeEditorProvider>
	);
}

function GeneralSettings({ isAdmin }: { isAdmin: boolean }) {
	return (
		<>
			<DateFormatSection isAdmin={isAdmin} />
		</>
	);
}

export function isAppearanceTab(value: unknown): value is AppearanceTab {
	return value === 'general' || value === 'stories';
}
