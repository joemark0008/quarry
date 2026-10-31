import { Check, Copy } from 'lucide-react';

import { SidePanelHeader } from './side-panel-header';
import { Button } from '@/components/ui/button';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import styles from './recommendation-manual-fix-panel.module.css';

interface RecommendationManualFixPanelProps {
	title: string;
	guidance: string | null;
	prompt: string | null;
}

export function RecommendationManualFixPanel({ title, guidance, prompt }: RecommendationManualFixPanelProps) {
	const { isCopied, copy } = useCopyToClipboard();

	return (
		<div className={styles.recommendationManualFixPanelDiv}>
			<SidePanelHeader label='How to fix' title={title} />

			<div className={styles.recommendationManualFixPanelDiv2}>
				<div className={styles.recommendationManualFixPanelDiv3}>
					<p className={styles.recommendationManualFixPanelP}>
						This change targets an auto-generated file, so quarry can&apos;t open a pull request directly.
						Apply it at the source, or paste the prompt below into your own coding assistant.
					</p>

					{guidance && (
						<div className={styles.recommendationManualFixPanelDiv4}>
							<div className={styles.recommendationManualFixPanelDiv5}>What to do</div>
							<p className={styles.recommendationManualFixPanelP2}>{guidance}</p>
						</div>
					)}

					{prompt && (
						<div className={styles.recommendationManualFixPanelDiv4}>
							<div className={styles.recommendationManualFixPanelDiv6}>
								<div className={styles.recommendationManualFixPanelDiv5}>
									Prompt for your coding LLM
								</div>
								<Button size='sm' variant='outline' onClick={() => copy(prompt)}>
									{isCopied ? <Check className={styles.recommendationManualFixPanelCheck} /> : <Copy className={styles.recommendationManualFixPanelCheck} />}
									{isCopied ? 'Copied' : 'Copy'}
								</Button>
							</div>
							<pre className={styles.recommendationManualFixPanelPre}>
								{prompt}
							</pre>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
