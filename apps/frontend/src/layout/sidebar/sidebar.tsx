import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useMatchRoute, useNavigate, useRouterState } from '@tanstack/react-router';
import { ChevronRight, PanelLeft, PlusIcon, SearchIcon, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ChatFilterMenu } from './sidebar-chat-filter-menu';
import { ChatListItem } from './sidebar-chat-list-item';
import { SidebarBackToApp } from './sidebar-back-to-app';
import { SidebarCommunity } from './sidebar-community';
import { SidebarSettingsNav } from './sidebar-settings-nav';
import { SidebarUserMenu } from './sidebar-user-menu';
import { SidebarVersionNotice } from './sidebar-version-notice';
import styles from './sidebar.module.css';
import type { ChatFilterType, ChatGroup, ChatGroupBy, GroupedChatItem } from '@quarry/shared/types';
import type { LucideIcon } from 'lucide-react';
import { ProjectSwitcher } from '@/components/project-selector';
import { NewChatDropTarget } from '@/feature/chat/components/new-chat-drop-target';
import { Spinner } from '@/components/ui/spinner';
import StoryIcon from '@/components/ui/story-icon';

import QuarryFullLogo from '@/components/icons/quarry-full-logo.svg';
import QuarryLogo from '@/components/icons/quarry-logo.svg';
import { Button } from '@/components/ui/button';
import { SimpleTooltip, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCommandMenuCallback } from '@/contexts/command-menu-callback';
import { useSidebar } from '@/contexts/sidebar';
import { useChatViewPreferences } from '@/hooks/use-chat-view-preferences';
import { resetLastAppLocation, useTrackLastAppLocation } from '@/hooks/use-last-app-location';
import { useIsCloud } from '@/hooks/use-quarry-mode';
import { useProjectSwitch } from '@/hooks/use-project-switch';
import { useSidebarSectionOpen } from '@/hooks/use-sidebar-section-open';
import { useTimeAgo } from '@/hooks/use-time-ago';
import { getActiveProjectId, setActiveProjectId } from '@/lib/active-project';
import { getShortcutLabel } from '@/lib/keyboard-shortcuts';
import { invalidateStoriesCaches } from '@/lib/stories-cache';
import { capitalize, cn, hideIf } from '@/lib/utils';
import { usePermissions } from '@/hooks/use-permissions';
import { useCanSeeAdvancedSettings } from '@/hooks/use-can-see-advanced-settings';
import { useSession } from '@/lib/auth-client';
import { useCurrentProject, useProjects } from '@/hooks/use-current-project';
import { chatApi } from '@/lib/chat-api';

export function Sidebar() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const matchRoute = useMatchRoute();
	const {
		isCollapsed,
		isMobile,
		isMobileOpen,
		closeMobile,
		toggle: toggleSidebar,
		expand: expandSidebar,
	} = useSidebar();
	const [toggleHintOpen, setToggleHintOpen] = useState(false);
	const { fire: openCommandMenu } = useCommandMenuCallback();
	const project = useCurrentProject();
	const projects = useProjects();
	const switchProject = useProjectSwitch(project.data?.id);
	const { isAdmin, isContextAdmin, isViewer } = usePermissions();
	const canSeeAdvancedSettings = useCanSeeAdvancedSettings();
	const isCloud = useIsCloud();
	const { groupBy, filters, setGroupBy, toggleFilter } = useChatViewPreferences();

	const locationPath = useRouterState({ select: (s) => s.location.pathname });
	const isSettingsRoute = matchRoute({ to: '/settings', fuzzy: true });
	const isInSettings = !!isSettingsRoute && !isViewer;
	const effectiveIsCollapsed = isMobile ? false : isCollapsed;
	useTrackLastAppLocation();

	useEffect(() => {
		setToggleHintOpen(false);
	}, [effectiveIsCollapsed]);

	useEffect(() => {
		if (isInSettings) {
			expandSidebar({ persist: false });
		}
	}, [isInSettings, expandSidebar]);

	useEffect(() => {
		if (isMobile && isMobileOpen) {
			closeMobile();
		}
	}, [locationPath]); // eslint-disable-line react-hooks/exhaustive-deps

	const handleNavigateHome = useCallback(() => {
		navigate({ to: '/' });
		if (isMobile) {
			closeMobile();
		}
	}, [navigate, isMobile, closeMobile]);

	const handleNavigateStories = useCallback(() => {
		invalidateStoriesCaches(queryClient);
		navigate({ to: '/stories', search: { folderId: null } });
		if (isMobile) {
			closeMobile();
		}
	}, [navigate, isMobile, closeMobile, queryClient]);

	const handleSearchChats = useCallback(() => {
		openCommandMenu();
		if (isMobile) {
			closeMobile();
		}
	}, [openCommandMenu, isMobile, closeMobile]);

	useEffect(() => {
		if (!project.data?.id) {
			return;
		}

		if (getActiveProjectId() !== project.data.id) {
			setActiveProjectId(project.data.id);
		}
	}, [project.data?.id]);

	const handleProjectChange = useCallback(
		async (projectId: string) => {
			const didSwitch = await switchProject(projectId);
			if (!didSwitch) {
				return;
			}
			resetLastAppLocation();
			if (isMobile) {
				closeMobile();
			}
		},
		[closeMobile, isMobile, switchProject],
	);

	return (
		<div className={styles.navbar} data-collapsed={effectiveIsCollapsed || undefined}>
			<div className={styles.brandRow}>
				<button
					type='button'
					onClick={handleNavigateHome}
					aria-label={isViewer ? 'View shared items' : 'New chat'}
					className={styles.brand}
				>
					{effectiveIsCollapsed ? (
						<QuarryLogo className={styles.brandMark} />
					) : (
						<QuarryFullLogo className={styles.brandLogo} />
					)}
				</button>
				{isMobile ? (
					<Button variant='ghost' size='icon-sm' onClick={closeMobile} aria-label='Close navigation'>
						<X />
					</Button>
				) : (
					<Tooltip open={toggleHintOpen} onOpenChange={setToggleHintOpen}>
						<TooltipTrigger asChild>
							<Button
								variant='ghost'
								size='icon-sm'
								onClick={() => toggleSidebar()}
								className={styles.toggle}
								aria-label='Toggle sidebar'
							>
								<PanelLeft />
							</Button>
						</TooltipTrigger>
						<TooltipContent side='right'>
							<span className={styles.toggleHint}>
								Toggle sidebar
								<kbd className={styles.toggleKbd}>{getShortcutLabel('toggle-sidebar')}</kbd>
							</span>
						</TooltipContent>
					</Tooltip>
				)}
			</div>

			{isInSettings && (
				<div className={styles.settingsHeader}>
					<SidebarBackToApp isCollapsed={effectiveIsCollapsed} />
					{!effectiveIsCollapsed && (
						<ProjectSwitcher
							projects={projects.data ?? []}
							currentProjectId={project.data?.id}
							onChange={handleProjectChange}
							variant='sidebar'
						/>
					)}
				</div>
			)}

			{!isInSettings && (
				<div className={styles.section}>
					{!effectiveIsCollapsed && <div className={styles.sectionLabel}>Workspace</div>}
					{!isViewer && (
						<NewChatDropTarget>
							<SidebarMenuButton
								icon={PlusIcon}
								label='New chat'
								shortcut={getShortcutLabel('new-chat')}
								isCollapsed={effectiveIsCollapsed}
								onClick={handleNavigateHome}
							/>
						</NewChatDropTarget>
					)}
					<SidebarMenuButton
						icon={SearchIcon}
						label='Search chats'
						shortcut={getShortcutLabel('command-menu')}
						isCollapsed={effectiveIsCollapsed}
						onClick={handleSearchChats}
					/>
					<SidebarMenuButton
						icon={StoryIcon as unknown as LucideIcon}
						label='Stories'
						shortcut={getShortcutLabel('go-to-stories')}
						isCollapsed={effectiveIsCollapsed}
						onClick={handleNavigateStories}
					/>
				</div>
			)}

			{isInSettings ? (
				<SidebarSettingsNav
					isCollapsed={effectiveIsCollapsed}
					canSeeAdvancedSettings={canSeeAdvancedSettings}
					isAdmin={isAdmin}
					isContextAdmin={isContextAdmin}
					isViewer={isViewer}
					isCloud={isCloud}
					hasProject={project.data != null}
				/>
			) : effectiveIsCollapsed ? (
				<div className={styles.spacer} />
			) : (
				<>
					<SidebarChatHeader
						groupBy={groupBy}
						filters={filters}
						onGroupByChange={setGroupBy}
						onFilterToggle={toggleFilter}
					/>
					<SidebarNav
						isCollapsed={false}
						groupBy={groupBy}
						filters={filters}
						isViewer={isViewer}
						isTrial={project.isSuccess && project.data === null}
					/>
				</>
			)}

			<div className={styles.footer}>
				{isInSettings && <SidebarCommunity isCollapsed={effectiveIsCollapsed} />}
				{isAdmin && <SidebarVersionNotice isCollapsed={effectiveIsCollapsed} />}
				<SidebarUserMenu isCollapsed={effectiveIsCollapsed} isInSettings={!!isInSettings} />
			</div>
		</div>
	);
}

function SidebarMenuButton({
	icon: Icon,
	label,
	shortcut,
	isCollapsed,
	onClick,
}: {
	icon: LucideIcon;
	label: string;
	shortcut: string;
	isCollapsed: boolean;
	onClick: () => void;
}) {
	const row = (
		<button type='button' className={styles.row} data-collapsed={isCollapsed || undefined} onClick={onClick}>
			<Icon className={styles.rowIcon} />
			{isCollapsed ? <span className='sr-only'>{label}</span> : <span className={styles.rowLabel}>{label}</span>}
			<kbd className={isCollapsed ? 'sr-only' : styles.rowKbd}>{shortcut}</kbd>
		</button>
	);
	return isCollapsed ? (
		<SimpleTooltip content={label} side='right'>
			{row}
		</SimpleTooltip>
	) : (
		row
	);
}

function SidebarChatHeader({
	groupBy,
	filters,
	onGroupByChange,
	onFilterToggle,
}: {
	groupBy: ChatGroupBy;
	filters: ChatFilterType[];
	onGroupByChange: (groupBy: ChatGroupBy) => void;
	onFilterToggle: (filter: ChatFilterType) => void;
}) {
	return (
		<div className={styles.chatHeader}>
			<span className={styles.sectionLabel}>Chats</span>
			<ChatFilterMenu
				groupBy={groupBy}
				filters={filters}
				onGroupByChange={onGroupByChange}
				onFilterToggle={onFilterToggle}
			/>
		</div>
	);
}

function SidebarNav({
	isCollapsed,
	groupBy,
	filters,
	isViewer,
	isTrial,
}: {
	isCollapsed: boolean;
	groupBy: ChatGroupBy;
	filters: ChatFilterType[];
	isViewer: boolean;
	isTrial: boolean;
}) {
	const groupedChats = useQuery({
		...chatApi.chat.listGrouped.queryOptions({ groupBy, filters }),
		placeholderData: keepPreviousData,
	});
	const groups = groupedChats.data?.groups;
	const isEmpty = groups?.every((group) => group.chats.length === 0);
	const { data: session } = useSession();
	const username = session?.user?.name;
	return (
		<div className={cn(styles.sidebarNavDiv, hideIf(isCollapsed))}>
			{groups?.map((group) => (
				<GroupSection key={group.label} group={group} groupBy={groupBy} />
			))}

			{isEmpty && (
				<div className={styles.sidebarNavDiv2}>
					{isViewer ? (
						'No chats shared with you.'
					) : isTrial ? (
						<>
							{username && (
								<span className={styles.sidebarNavSpan}>
									Welcome to quarry, {capitalize(username)}!
								</span>
							)}
							<span className={styles.sidebarNavSpan2}>
								Your chat history will appear here.
								<br />
								Start a new chat!
							</span>
						</>
					) : (
						<>
							No chats yet.
							<br />
							Start a new chat!
						</>
					)}
				</div>
			)}
		</div>
	);
}

const GROUP_INITIAL_COUNT = 10;

function GroupSection({ group, groupBy }: { group: ChatGroup; groupBy: ChatGroupBy }) {
	const { isOpen, toggle } = useSidebarSectionOpen(`section:chat-group:${group.label}`);
	const [expanded, setExpanded] = useState(false);
	const hasMore = group.chats.length > GROUP_INITIAL_COUNT;
	const visibleChats = expanded ? group.chats : group.chats.slice(0, GROUP_INITIAL_COUNT);

	if (group.chats.length === 0) {
		return null;
	}

	const showChats = group.label ? isOpen : true;

	return (
		<>
			{group.label && (
				<div className={styles.sidebarChatHeaderDiv}>
					<SidebarSectionHeader label={group.label} isOpen={isOpen} onToggle={toggle} />
				</div>
			)}

			{showChats && (
				<div className={styles.groupSectionDiv}>
					{visibleChats.map((item) =>
						item.kind === 'shared' ? (
							<SharedChatGroupItem key={`shared-${item.shareId}`} item={item} groupBy={groupBy} />
						) : (
							<ChatListItem key={item.id} chat={item} />
						),
					)}

					{hasMore && (
						<button
							type='button'
							onClick={() => setExpanded((p) => !p)}
							className={styles.groupSectionButton}
						>
							{expanded ? 'Show less' : 'Show more'}
						</button>
					)}
				</div>
			)}
		</>
	);
}

function SharedChatGroupItem({ item, groupBy }: { item: GroupedChatItem; groupBy: ChatGroupBy }) {
	const timeAgo = useTimeAgo(item.updatedAt);

	return (
		<Link
			params={{ shareId: item.shareId! }}
			to='/shared-chat/$shareId'
			className={`${styles.sharedChatGroupItemLink} group`}
			inactiveProps={{ className: styles.sharedChatGroupItemClassName }}
			activeProps={{ className: styles.sharedChatGroupItemClassName2 }}
		>
			<div className={styles.sharedChatGroupItemDiv}>{item.title}</div>
			<div className={styles.sharedChatGroupItemDiv2}>
				{groupBy === 'ownership' ? timeAgo.humanReadable : `by ${item.ownerName}`}
			</div>
		</Link>
	);
}

function SidebarSectionHeader({
	label,
	isOpen,
	onToggle,
	activity,
	extra,
}: {
	label: string;
	isOpen: boolean;
	onToggle: () => void;
	activity?: { running: boolean; unread: boolean };
	extra?: React.ReactNode;
}) {
	const showIndicator = !isOpen && activity;

	return (
		<button onClick={onToggle} className={`${styles.sidebarSectionHeaderButton} group`}>
			<span>{label}</span>
			<ChevronRight
				className={cn(
					styles.sidebarSectionHeaderChevronRight,
					isOpen ? styles.sidebarSectionHeaderChevronRight2 : styles.sidebarSectionHeaderChevronRight3,
				)}
			/>
			<div className={styles.sidebarSectionHeaderDiv}>
				{showIndicator && activity.running && <Spinner className={styles.sidebarSectionHeaderSpinner} />}
				{showIndicator && !activity.running && activity.unread && (
					<span className={styles.sidebarSectionHeaderSpan} />
				)}
				{!showIndicator && extra}
			</div>
		</button>
	);
}
