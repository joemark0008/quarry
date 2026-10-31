import { Check, Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import styles from './project-identifier.module.css';

export function ProjectIdentifier({ projectId }: { projectId: string }) {
	const { isCopied, copy } = useCopyToClipboard();

	return (
		<div className={styles.projectIdentifierDiv}>
			<code className={styles.projectIdentifierCode}>{projectId}</code>
			<Button
				type='button'
				variant='ghost-muted'
				size='icon-xs'
				className={styles.projectIdentifierButton}
				aria-label={`Copy project ID ${projectId}`}
				onClick={() => void copy(projectId)}
			>
				{isCopied ? <Check className={styles.projectIdentifierCheck} /> : <Copy className={styles.projectIdentifierCopy} />}
			</Button>
		</div>
	);
}
