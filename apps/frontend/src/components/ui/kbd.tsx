import type { HTMLAttributes } from 'react';
import type { Shortcut } from '@/lib/platform';

import { formatShortcut } from '@/lib/platform';
import { cn } from '@/lib/utils';
import styles from './kbd.module.css';

type KbdProps = HTMLAttributes<HTMLSpanElement> & {
	shortcut?: Shortcut;
	keys?: string[];
};

export function Kbd({ shortcut, keys, className, ...props }: KbdProps) {
	const tokens = keys ?? (shortcut ? formatShortcut(shortcut) : []);

	return (
		<span className={cn(styles.kbdSpan, className)} {...props}>
			{tokens.map((token, index) => (
				<kbd
					key={`${token}-${index}`}
					className={styles.kbdKbd}
				>
					{token}
				</kbd>
			))}
		</span>
	);
}
