import { useMediaQuery } from '@mantine/hooks';
import { createContext, useContext, useCallback, useState } from 'react';
import { useMemoObject } from '@/hooks/useMemoObject';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { createLocalStorage } from '@/lib/local-storage';
import { useIsMobile } from '@/hooks/use-is-mobile';

type SidebarContextValue = {
	isMobile: boolean;
	isCollapsed: boolean;
	isMobileOpen: boolean;
	toggle: (opts?: { persist?: boolean }) => void;
	collapse: (opts?: { persist?: boolean }) => void;
	expand: (opts?: { persist?: boolean }) => void;
	openMobile: () => void;
	closeMobile: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export const useSidebar = () => {
	const context = useContext(SidebarContext);
	if (!context) {
		throw new Error('useSidebar must be used within a SidebarProvider');
	}
	return context;
};

/** No stored choice means the window decides: a rail below 80em, expanded above it. */
const storage = createLocalStorage<'true' | 'false'>('sidebar-collapsed');

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
	const isMobile = useIsMobile();
	const [chosen, setChosen] = useLocalStorage(storage);
	const isWide = useMediaQuery('(min-width: 80em)', true) !== false;
	const isCollapsed = !isMobile && (chosen === null ? !isWide : chosen === 'true');
	const [isMobileOpen, setIsMobileOpen] = useState(false);

	const toggle: SidebarContextValue['toggle'] = useCallback(
		(opts) => {
			if (isMobile) {
				setIsMobileOpen((prev) => !prev);
				return;
			}
			setChosen(isCollapsed ? 'false' : 'true', opts);
		},
		[setChosen, isMobile, isCollapsed],
	);

	const collapse: SidebarContextValue['collapse'] = useCallback(
		(opts) => {
			setChosen('true', opts);
		},
		[setChosen],
	);

	const expand: SidebarContextValue['expand'] = useCallback(
		(opts) => {
			setChosen('false', opts);
		},
		[setChosen],
	);

	const openMobile = useCallback(() => setIsMobileOpen(true), []);
	const closeMobile = useCallback(() => setIsMobileOpen(false), []);

	return (
		<SidebarContext.Provider
			value={useMemoObject({
				isMobile,
				isCollapsed,
				isMobileOpen,
				toggle,
				collapse,
				expand,
				openMobile,
				closeMobile,
			})}
		>
			{children}
		</SidebarContext.Provider>
	);
};
