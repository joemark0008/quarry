import { Outlet } from '@tanstack/react-router';
import { MobileHeader } from '@/layout/mobile-header';
import styles from './settings-layout.module.css';


export function SettingsLayout() {
	return (
		<div className={styles.settingsLayoutDiv}>
			<MobileHeader />
			<Outlet />
		</div>
	);
}
