import { createFileRoute, Outlet } from '@tanstack/react-router';
import { MobileHeader } from '@/components/mobile-header';
import { requireAdvancedSettingsAccess } from '@/lib/route-guards';
import styles from './settings.module.css';

export const Route = createFileRoute('/_protected/settings')({
	beforeLoad: ({ location }) => requireAdvancedSettingsAccess(location.pathname),
	component: SettingsLayout,
});

function SettingsLayout() {
	return (
		<div className={styles.settingsLayoutDiv}>
			<MobileHeader />
			<Outlet />
		</div>
	);
}
