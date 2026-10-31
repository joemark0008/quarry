import { Burger } from '@mantine/core';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Keyboard, LogOut, Monitor, Moon, SearchIcon, SlidersVertical, Sun } from 'lucide-react';
import { Fragment } from 'react';

import styles from './top-bar.module.css';
import { Avatar } from '@/components/ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCommandMenuCallback } from '@/contexts/command-menu-callback';
import { useSidebar } from '@/contexts/sidebar';
import { useTheme } from '@/contexts/theme.provider';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useSignOut } from '@/hooks/use-sign-out';
import { getShortcutLabel } from '@/lib/keyboard-shortcuts';
import { crumbs } from '@/lib/navigation';

const THEME_OPTIONS = [
	{ value: 'light', label: 'Light', icon: Sun },
	{ value: 'dark', label: 'Dark', icon: Moon },
	{ value: 'system', label: 'System', icon: Monitor },
] as const;

export function TopBar({ onOpenKeyboardShortcuts }: { onOpenKeyboardShortcuts: () => void }) {
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const { isMobileOpen, openMobile, closeMobile } = useSidebar();
	const { fire: openCommandMenu } = useCommandMenuCallback();
	const trail = crumbs(pathname);

	return (
		<div className={styles.bar}>
			<Burger
				className={styles.burger}
				size='sm'
				opened={isMobileOpen}
				onClick={isMobileOpen ? closeMobile : openMobile}
				aria-label='Toggle navigation'
			/>
			<nav aria-label='Breadcrumb' className={styles.crumbs}>
				{trail.map((crumb, index) => (
					<Fragment key={crumb}>
						{index > 0 && <span className={styles.crumbSeparator}>/</span>}
						<span className={index === trail.length - 1 ? styles.crumbCurrent : undefined}>{crumb}</span>
					</Fragment>
				))}
			</nav>
			<button type='button' className={styles.search} onClick={() => openCommandMenu()} aria-label='Search'>
				<SearchIcon />
				<span className={styles.searchLabel}>Search</span>
				<kbd className={styles.searchKey}>{getShortcutLabel('command-menu')}</kbd>
			</button>
			<AccountMenu onOpenKeyboardShortcuts={onOpenKeyboardShortcuts} />
		</div>
	);
}

function AccountMenu({ onOpenKeyboardShortcuts }: { onOpenKeyboardShortcuts: () => void }) {
	const navigate = useNavigate();
	const { data: user } = useCurrentUser();
	const { theme, setTheme } = useTheme();
	const signOut = useSignOut();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button type='button' className={styles.account} aria-label='Account menu'>
					<Avatar username={user?.name ?? '?'} size='sm' />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end' className={styles.menu}>
				<div className={styles.menuIdentity}>
					{user?.name}
					<span className={styles.menuEmail}>{user?.email}</span>
				</div>
				<DropdownMenuSeparator />
				<DropdownMenuLabel>Theme</DropdownMenuLabel>
				<DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as typeof theme)}>
					{THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
						<DropdownMenuRadioItem key={value} value={value} indicator='check'>
							<Icon />
							{label}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem onSelect={() => void navigate({ to: '/settings' })}>
					<SlidersVertical />
					Settings
				</DropdownMenuItem>
				<DropdownMenuItem onSelect={onOpenKeyboardShortcuts}>
					<Keyboard />
					Keyboard shortcuts
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onSelect={() => void signOut()}>
					<LogOut />
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
