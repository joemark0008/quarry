import { AppShell } from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Sidebar } from './sidebar/sidebar';
import { TopBar } from './top-bar/top-bar';
import styles from './app-layout.module.css';
import { CommandMenu } from './command-menu';
import { KeyboardShortcutsDialog } from './keyboard-shortcuts-dialog';
import { CommandMenuCallbackProvider, useCommandMenuCallback } from '@/contexts/command-menu-callback';
import { SidebarProvider, useSidebar } from '@/contexts/sidebar';
import { useTheme } from '@/contexts/theme.provider';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { usePermissions } from '@/hooks/use-permissions';
import { navLinks } from '@/lib/navigation';

const SEQUENCE_TIMEOUT_MS = 1000;

export function AppLayout() {
	return (
		<CommandMenuCallbackProvider>
			<SidebarProvider>
				<AppLayoutContent />
			</SidebarProvider>
		</CommandMenuCallbackProvider>
	);
}

function AppLayoutContent() {
	const { isCollapsed, isMobile, isMobileOpen, closeMobile } = useSidebar();
	const [keyboardShortcutsOpen, setKeyboardShortcutsOpen] = useState(false);

	return (
		<AppShell
			className={styles.shell}
			layout='alt'
			header={{ height: '3.75rem' }}
			navbar={{
				width: isCollapsed ? '4.5rem' : '15rem',
				breakpoint: 'sm',
				collapsed: { mobile: !isMobileOpen },
			}}
			transitionDuration={200}
			transitionTimingFunction='cubic-bezier(.2,.8,.2,1)'
			padding={0}
		>
			<GlobalShortcuts onOpenKeyboardShortcuts={() => setKeyboardShortcutsOpen(true)} />
			<CommandMenu onOpenKeyboardShortcuts={() => setKeyboardShortcutsOpen(true)} />
			<KeyboardShortcutsDialog open={keyboardShortcutsOpen} onOpenChange={setKeyboardShortcutsOpen} />
			<AppShell.Header withBorder={false}>
				<TopBar onOpenKeyboardShortcuts={() => setKeyboardShortcutsOpen(true)} />
			</AppShell.Header>
			<AppShell.Navbar withBorder={false} className={styles.navbar}>
				<Sidebar />
			</AppShell.Navbar>
			{isMobile && isMobileOpen && <div className={styles.backdrop} onClick={closeMobile} />}
			<AppShell.Main className={styles.main}>
				<div className={`app-page ${styles.page}`}>
					<Outlet />
				</div>
			</AppShell.Main>
		</AppShell>
	);
}

function GlobalShortcuts({ onOpenKeyboardShortcuts }: { onOpenKeyboardShortcuts: () => void }) {
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const { toggle, isMobile } = useSidebar();
	const { theme, setTheme } = useTheme();
	const { fire: openCommandMenu } = useCommandMenuCallback();
	const { canStartNewChat } = usePermissions();

	const navigateHome = useCallback(() => navigate({ to: '/' }), [navigate]);
	const navigateStories = useCallback(() => navigate({ to: '/stories', search: { folderId: null } }), [navigate]);
	const toggleTheme = useCallback(() => {
		setTheme(theme === 'light' ? 'dark' : 'light');
	}, [theme, setTheme]);

	useKeyboardShortcuts({
		'toggle-sidebar': toggle,
		'command-menu': openCommandMenu,
		'toggle-theme': toggleTheme,
		'new-chat': canStartNewChat ? navigateHome : undefined,
		'go-to-stories': navigateStories,
		'keyboard-help': onOpenKeyboardShortcuts,
	});

	// The settings sidebar binds `/` to its own search field.
	const isInSettings = pathname.startsWith('/settings');
	useHotkeys([
		['[', () => !isMobile && toggle()],
		['/', () => !isInSettings && openCommandMenu()],
	]);

	useGoToShortcuts();

	return null;
}

/** `G`, then a letter within a second, opens the page with that `NavLink.shortcut`. */
function useGoToShortcuts() {
	const navigate = useNavigate();
	const awaitingUntil = useRef(0);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement | null;
			const isTyping = target?.closest('input, textarea, select, [contenteditable="true"]');
			if (isTyping || event.metaKey || event.ctrlKey || event.altKey) {
				return;
			}
			const key = event.key.toUpperCase();
			if (Date.now() < awaitingUntil.current) {
				awaitingUntil.current = 0;
				const link = navLinks.find((entry) => entry.shortcut === `G ${key}`);
				if (link) {
					event.preventDefault();
					void navigate({
						to: link.to as never,
						search: link.to === '/stories' ? ({ folderId: null } as never) : undefined,
					});
				}
				return;
			}
			if (key === 'G') {
				awaitingUntil.current = Date.now() + SEQUENCE_TIMEOUT_MS;
			}
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [navigate]);
}
