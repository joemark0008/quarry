import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, PlusIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { SYSTEM_EXAMPLE_PROJECT_ID } from '@quarry/shared';
import type { UIMessage } from '@quarry/api/agent/types/chat';
import type { StoryItem } from '@/lib/stories-page';

import { ChatInput } from '@/components/chat-input';
import { ChatMessages } from '@/components/chat-messages/chat-messages';
import { SavedPromptSuggestions } from '@/components/chat-saved-prompt-suggestions';
import { MobileHeader } from '@/components/mobile-header';
import { ProjectSwitcher } from '@/components/project-selector';
import { StoryCard } from '@/components/stories-groups';
import { ViewerHome } from '@/components/viewer-home';
import { useAgentContext, useAgentMessagesSelector } from '@/contexts/agent.provider';
import { useIsDarkMode } from '@/contexts/theme.provider';
import { useMultiProject } from '@/hooks/use-multi-project';
import { useIsCloud } from '@/hooks/use-quarry-mode';
import { usePermissions } from '@/hooks/use-permissions';
import { useProjectSwitch } from '@/hooks/use-project-switch';
import { useResizeObserver } from '@/hooks/use-resize-observer';
import { useSession } from '@/lib/auth-client';
import { buildStoryItems } from '@/lib/stories-page';
import { capitalize, cn } from '@/lib/utils';
import { useCurrentProject, useProjects } from '@/hooks/use-current-project';
import { storyApi } from '@/lib/story-api';
import styles from './_chat-layout.index.module.css';

export const Route = createFileRoute('/_protected/_chat-layout/')({
	validateSearch: (search: Record<string, unknown>): { admin?: boolean; example?: boolean } => ({
		admin: search.admin === true || search.admin === 'true' ? true : undefined,
		example: search.example === true || search.example === 'true' ? true : undefined,
	}),
	component: RouteComponent,
});

function RouteComponent() {
	const { isViewer } = usePermissions();
	if (isViewer) {
		return <ViewerHome />;
	}
	return <HomePage />;
}

function HomePage() {
	const { data: session } = useSession();
	const username = session?.user?.name;
	const { setAdminMode } = useAgentContext();
	const isEmptyState = useAgentMessagesSelector(checkHasNoMessages);
	const { canChatWithQuarryData } = usePermissions();
	const { admin: adminSearch, example: exampleSearch } = Route.useSearch();
	const navigate = useNavigate();

	useEffect(() => {
		if (!canChatWithQuarryData) {
			return;
		}
		setAdminMode(adminSearch === true);
	}, [canChatWithQuarryData, adminSearch, setAdminMode]);

	const project = useCurrentProject();
	const projects = useProjects();
	const switchProject = useProjectSwitch(project.data?.id);
	const multiProjectMode = useMultiProject();
	const isCloud = useIsCloud();
	const showProjectSetupCue = project.isSuccess && project.data === null;
	const showExampleProject = isCloud && (showProjectSetupCue || exampleSearch === true);
	const storiesProjectId = showExampleProject ? SYSTEM_EXAMPLE_PROJECT_ID : project.data?.id;
	const stateTitle = `${username ? capitalize(username) : ''}, what do you want to analyze?`;
	const isDark = useIsDarkMode();
	const hasProject = !!project.data?.id;
	const stories = useQuery({
		...storyApi.story.listAll.queryOptions({ projectId: storiesProjectId }),
		enabled: isEmptyState && !!storiesProjectId,
	});
	const sharedStories = useQuery({
		...storyApi.storyShare.list.queryOptions({ projectId: storiesProjectId ?? '' }),
		enabled: isEmptyState && !!storiesProjectId,
	});
	const favorites = useQuery({
		...storyApi.favorite.list.queryOptions(),
		enabled: isEmptyState && hasProject,
	});
	const folderItems = useQuery({
		...storyApi.storyFolder.listItems.queryOptions(),
		enabled: isEmptyState && hasProject,
	});
	const folderTree = useQuery({
		...storyApi.storyFolder.listTree.queryOptions({ archived: false }),
		enabled: isEmptyState && hasProject,
	});
	const storiesGridRef = useRef<HTMLDivElement>(null);
	const [storyCols, setStoryCols] = useState(STORY_CARD_MAX_COLS);
	const storyCount = (stories.data?.length ?? 0) + (sharedStories.data?.length ?? 0);
	const hasStories = storyCount > 0;
	useResizeObserver(
		storiesGridRef,
		(el) => {
			setStoryCols(computeStoryCols(el.getBoundingClientRect().width));
		},
		[hasStories],
	);
	const folderItemMap = useMemo(() => {
		const map = new Map<string, string>();
		for (const item of folderItems.data ?? []) {
			map.set(item.storyId, item.folderId);
		}
		return map;
	}, [folderItems.data]);
	const latestStoryItems = useMemo(() => {
		const items = buildStoryItems({
			userStories: stories.data ?? [],
			sharedStories: sharedStories.data ?? [],
			currentUserName: session?.user?.name ?? username ?? '',
			favoriteStoryIds: favorites.data?.storyIds,
			folderItemMap,
			folders: folderTree.data ?? [],
		});
		return [...items]
			.sort((a, b) => {
				const rankDiff = storyPriorityRank(a) - storyPriorityRank(b);
				if (rankDiff !== 0) {
					return rankDiff;
				}
				return b.createdAt.getTime() - a.createdAt.getTime();
			})
			.slice(0, storyCols);
	}, [
		stories.data,
		sharedStories.data,
		session?.user?.name,
		storyCols,
		username,
		favorites.data,
		folderItemMap,
		folderTree.data,
	]);
	const storyGroups = useMemo(() => buildStoryGroups(latestStoryItems), [latestStoryItems]);
	const hasMoreStories = storyCount > storyCols;
	const storiesGrid =
		latestStoryItems.length > 0 ? (
			<div className={styles.storiesGridDiv}>
				<div
					ref={storiesGridRef}
					className={styles.storiesGridDiv2}
					style={{
						gridTemplateColumns: `repeat(${storyCols}, minmax(0, 1fr))`,
					}}
				>
					{renderStoryGroupHeaders(storyGroups)}
					{latestStoryItems.map((item, index) => (
						<div key={item.storyId} style={{ gridColumn: index + 1, gridRow: 2 }}>
							<StoryCard item={item} displayMode='grid' showArchived={false} />
						</div>
					))}
				</div>
				{!showExampleProject && hasMoreStories && (
					<button
						type='button'
						onClick={() => navigate({ to: '/stories', search: { folderId: null } })}
						className={cn(
							styles.storiesGridButton,
							styles.storiesGridButton2,
							styles.storiesGridButton3,
						)}
					>
						<div className={styles.storiesGridDiv3}>
							<PlusIcon className={styles.storiesGridPlusIcon} />
							<span className={styles.storiesGridSpan}>Show more</span>
						</div>
					</button>
				)}
			</div>
		) : null;

	const logoSrc = isDark ? '/darkLogo.svg' : '/lightLogo.svg';
	const cardLogoSrc = isDark ? '/dark-card-logo.svg' : '/light-card-logo.svg';

	return (
		<div className={styles.homePageDiv}>
			<MobileHeader showExampleProjectInfo={showExampleProject} />
			{isEmptyState &&
				!showExampleProject &&
				multiProjectMode === 'switch' &&
				project.data &&
				(projects.data?.length ?? 0) > 1 && (
					<div className={styles.homePageDiv2}>
						<ProjectSwitcher
							projects={projects.data ?? []}
							currentProjectId={project.data.id}
							onChange={switchProject}
							variant='inline'
						/>
					</div>
				)}
			{!isEmptyState ? (
				<>
					<ChatMessages />
					<ChatInput />
				</>
			) : (
				<>
					<div
						className={cn(
							styles.homePageDiv3,
							showExampleProject || showProjectSetupCue
								? ''
								: latestStoryItems.length > 0
									? styles.homePageDiv4
									: styles.homePageDiv5,
						)}
					>
						{showExampleProject ? (
							<>
								<div className={styles.homePageDiv6}>
									<h1 className={styles.homePageH1}>{stateTitle}</h1>
								</div>
								<div className={styles.homePageDiv7}>
									<img
										src={logoSrc}
										alt=''
										aria-hidden
										className={styles.homePageImg}
									/>
									<ChatInput />
									<SavedPromptSuggestions projectId={SYSTEM_EXAMPLE_PROJECT_ID} />
								</div>
								{storiesGrid}
							</>
						) : showProjectSetupCue ? (
							<div className={styles.homePageDiv8}>
								<HomeLinkCard
									to='/settings/project'
									label='Project required'
									title='Create your first project'
									subtitle='Use New project in the project switcher to start chatting'
									logoSrc={cardLogoSrc}
								/>
							</div>
						) : (
							<>
								<div className={styles.homePageDiv9}>
									{stateTitle}
								</div>
								<div className={styles.homePageDiv10}>
									<img
										src={logoSrc}
										alt=''
										aria-hidden
										className={styles.homePageImg}
									/>
									<ChatInput acceptsPendingStoryReferences />
									<SavedPromptSuggestions />
								</div>
								{storiesGrid}
							</>
						)}
					</div>
				</>
			)}
		</div>
	);
}

function HomeLinkCard({
	to,
	label,
	title,
	subtitle,
	logoSrc,
}: {
	to: '/settings/project';
	label: string;
	title: string;
	subtitle: string;
	logoSrc: string;
}) {
	return (
		<Link
			to={to}
			className={cn(
				`${styles.homeLinkCardLink} group`,
				styles.homeLinkCardLink2,
			)}
		>
			<img
				src={logoSrc}
				alt=''
				aria-hidden
				className={styles.homeLinkCardImg}
			/>
			<div className={styles.homeLinkCardDiv}>
				<span className={styles.homeLinkCardSpan}>
					{label}
				</span>
				<div className={styles.homeLinkCardDiv2}>
					<span className={styles.homeLinkCardSpan2}>{title}</span>
					<span className={styles.homeLinkCardSpan3}>{subtitle}</span>
				</div>
			</div>
			<div className={styles.homeLinkCardDiv3}>
				<ArrowRight className={styles.homeLinkCardArrowRight} />
			</div>
		</Link>
	);
}

const STORY_CARD_MIN_WIDTH = 170;
const STORY_CARD_GAP = 20;
const STORY_CARD_MAX_COLS = 3;

type StoryGroup = { key: 'favorites' | 'pinned' | 'latest'; label: string; items: StoryItem[] };

function storyPriorityRank(item: StoryItem): number {
	if (item.isFavorited) {
		return 0;
	}
	if (isPinnedStory(item)) {
		return 1;
	}
	return 2;
}

function buildStoryGroups(items: StoryItem[]): StoryGroup[] {
	const favorites = items.filter((item) => item.isFavorited);
	const pinned = items.filter((item) => !item.isFavorited && isPinnedStory(item));
	const latest = items.filter((item) => !item.isFavorited && !isPinnedStory(item));
	const groups: StoryGroup[] = [
		{
			key: 'favorites',
			label: pluralize('Favorite story', 'Favorite stories', favorites.length),
			items: favorites,
		},
		{ key: 'pinned', label: pluralize('Pinned story', 'Pinned stories', pinned.length), items: pinned },
		{ key: 'latest', label: pluralize('Latest story', 'Latest stories', latest.length), items: latest },
	];
	return groups.filter((group) => group.items.length > 0);
}

function renderStoryGroupHeaders(groups: StoryGroup[]) {
	let startColumn = 1;
	return groups.map((group) => {
		const column = `${startColumn} / span ${group.items.length}`;
		startColumn += group.items.length;
		return (
			<div
				key={group.key}
				className={`${styles.renderStoryGroupHeadersDiv} text-md`}
				style={{ gridColumn: column, gridRow: 1 }}
			>
				{group.label}
			</div>
		);
	});
}

function computeStoryCols(containerWidth: number) {
	const n = Math.floor((containerWidth + STORY_CARD_GAP) / (STORY_CARD_MIN_WIDTH + STORY_CARD_GAP));
	return Math.max(1, Math.min(n, STORY_CARD_MAX_COLS));
}

function isPinnedStory(item: StoryItem): boolean {
	return item.isPinned || (item.sharing?.isPinned ?? false);
}

function checkHasNoMessages(messages: UIMessage[]): boolean {
	return messages.length === 0;
}

function pluralize(singular: string, plural: string, count: number): string {
	return count === 1 ? singular : plural;
}
