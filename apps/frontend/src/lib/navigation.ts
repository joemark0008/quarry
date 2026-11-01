import {
	ChartColumn,
	BookOpen,
	BookOpenText,
	Boxes,
	Database,
	FileSearch,
	HardDrive,
	Lightbulb,
	MessageSquare,
	MessagesSquare,
	Palette,
	Settings2,
	UserRound,
	Users,
	Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { FileRouteTypes } from '@/routeTree.gen';

export type AppPath = Extract<FileRouteTypes['to'], `/${string}`>;

export type NavSection = 'workspace' | 'user' | 'project' | 'context' | 'observability' | 'instance';

export interface NavContext {
	canSeeAdvancedSettings: boolean;
	isAdmin: boolean;
	isContextAdmin: boolean;
	isCloud: boolean;
	isViewer: boolean;
}

export interface NavLink {
	icon: LucideIcon;
	label: string;
	to: AppPath;
	section: NavSection;
	search?: { admin?: boolean };
	/** Match exactly, not as a prefix. */
	exact?: boolean;
	/** 'G S' opens this page: G, then the letter within a second. */
	shortcut?: string;
	/** Routable and searchable, but no sidebar row. */
	sidebar?: false;
	/** Path segment to breadcrumb label. */
	tabs?: Record<string, string>;
	leavesSettings?: boolean;
	requiresProject?: boolean;
	visible?: (context: NavContext) => boolean;
}

export const NAV_SECTIONS: { id: NavSection; label: string; isAdvanced?: boolean; isSettings?: boolean }[] = [
	{ id: 'workspace', label: 'Workspace' },
	{ id: 'user', label: 'User', isSettings: true },
	{ id: 'project', label: 'Project', isSettings: true, isAdvanced: true },
	{ id: 'context', label: 'Context', isSettings: true, isAdvanced: true },
	{ id: 'observability', label: 'Observability', isSettings: true, isAdvanced: true },
	{ id: 'instance', label: 'Instance', isSettings: true, isAdvanced: true },
];

const isMember = ({ isViewer }: NavContext) => !isViewer;
const isContextManager = ({ isAdmin, isContextAdmin }: NavContext) => isAdmin || isContextAdmin;

export const navLinks: NavLink[] = [
	{ icon: MessageSquare, label: 'Chat', to: '/', exact: true, section: 'workspace', sidebar: false, shortcut: 'G H' },
	{ icon: BookOpenText, label: 'Stories', to: '/stories', section: 'workspace', sidebar: false, shortcut: 'G S' },
	{
		icon: UserRound,
		label: 'Account',
		to: '/settings/account',
		section: 'user',
		exact: true,
		shortcut: 'G A',
		visible: isMember,
	},
	{
		icon: Settings2,
		label: 'Project Settings',
		to: '/settings/project',
		section: 'project',
		exact: true,
		shortcut: 'G P',
		visible: isMember,
	},
	{
		icon: Database,
		label: 'Warehouse',
		to: '/settings/project/warehouse',
		section: 'project',
		requiresProject: true,
		visible: isMember,
	},
	{
		icon: Boxes,
		label: 'Agent',
		to: '/settings/project/agent',
		section: 'project',
		requiresProject: true,
		visible: isMember,
	},
	{
		icon: Wrench,
		label: 'Query tools',
		to: '/settings/project/query-tools',
		section: 'project',
		requiresProject: true,
		visible: isMember,
	},
	{
		icon: BookOpen,
		label: 'Skills',
		to: '/settings/project/skills',
		section: 'project',
		requiresProject: true,
		visible: isContextManager,
	},
	{
		icon: Palette,
		label: 'Appearance',
		to: '/settings/appearance',
		section: 'project',
		requiresProject: true,
		visible: isMember,
	},
	{
		icon: Lightbulb,
		label: 'Recommendations',
		to: '/settings/recommendations',
		section: 'context',
		visible: isContextManager,
	},
	{
		icon: FileSearch,
		label: 'File Explorer',
		to: '/settings/context-explorer',
		section: 'context',
		visible: isContextManager,
	},
	{
		icon: ChartColumn,
		label: 'Usage & Costs',
		to: '/settings/usage',
		section: 'observability',
		requiresProject: true,
		visible: ({ isViewer }) => !isViewer,
	},
	{
		icon: MessagesSquare,
		label: 'Chat with quarry data',
		to: '/',
		search: { admin: true },
		section: 'observability',
		exact: true,
		leavesSettings: true,
		visible: isContextManager,
	},
	{
		icon: Users,
		label: 'Users',
		to: '/settings/users',
		section: 'instance',
		visible: ({ isAdmin }) => isAdmin,
	},
	{
		icon: HardDrive,
		label: 'Storage',
		to: '/settings/storage',
		section: 'instance',
		visible: ({ isViewer, isCloud }) => !isViewer && !isCloud,
	},
];

export function getVisibleSettingsNavGroups(context: NavContext, hasProject = true) {
	return NAV_SECTIONS.filter((section) => section.isSettings)
		.filter((section) => !section.isAdvanced || context.canSeeAdvancedSettings)
		.map((section) => ({
			label: section.label,
			items: navLinks.filter(
				(link) =>
					link.section === section.id &&
					link.sidebar !== false &&
					(!link.requiresProject || hasProject) &&
					(link.visible?.(context) ?? true),
			),
		}))
		.filter((group) => group.items.length > 0);
}

/** The longest matching `to` owns the current path. */
function owningLink(pathname: string): NavLink | undefined {
	return navLinks
		.filter((link) => !link.search)
		.filter((link) => pathname === link.to || (link.to !== '/' && pathname.startsWith(`${link.to}/`)))
		.sort((a, b) => b.to.length - a.to.length)[0];
}

export function crumbs(pathname: string): string[] {
	const link = owningLink(pathname);
	if (!link) {
		// Everything else under the root is an open chat.
		return ['Workspace', 'Chat'];
	}
	const parts = [NAV_SECTIONS.find((section) => section.id === link.section)?.label, link.label];
	if (pathname !== link.to) {
		const segment = pathname.slice(link.to.length + 1).split('/')[0];
		parts.push(link.tabs?.[segment] ?? 'Details');
	}
	return (parts.filter(Boolean) as string[]).filter(
		(part, index, all) => index === 0 || part.toLowerCase() !== all[index - 1].toLowerCase(),
	);
}
