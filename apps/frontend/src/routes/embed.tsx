import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useLayoutEffect } from 'react';
import styles from './embed.module.css';

export const Route = createFileRoute('/embed')({
	component: EmbedLayout,
});

function EmbedLayout() {
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
