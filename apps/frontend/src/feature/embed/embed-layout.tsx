import { Outlet } from '@tanstack/react-router';
import { useLayoutEffect } from 'react';
import styles from './embed-layout.module.css';


export function EmbedLayout() {
	useLayoutEffect(() => {
		const root = document.documentElement;
		root.classList.add('quarry-embed');
		return () => {
			root.classList.remove('quarry-embed');
		};
	}, []);

	return (
		<div className={styles.embedLayoutDiv}>
			<Outlet />
		</div>
	);
}
