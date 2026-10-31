import { ToolCallWrapper } from './tool-call-wrapper';
import type { ToolCallComponentProps } from '.';
import { Badge } from '@/components/ui/badge';
import { useToolCallContext } from '@/contexts/tool-call';
import styles from './record-recommendation.module.css';

interface RecommendationInsight {
	signalType: string;
	metric: string;
	count: number;
	triggerRefs?: { chatId: string; targetId?: string }[];
	snippet?: string;
}

interface RecordRecommendationInput {
	suggestedFile?: string;
	subjectKey?: string;
	title?: string;
	summary?: string;
	suggestedAction?: string;
	insights?: RecommendationInsight[];
}

export const RecordRecommendationToolCall = ({ toolPart }: ToolCallComponentProps) => {
	const { isSettled } = useToolCallContext();

	const input = toolPart.input as RecordRecommendationInput | undefined;
	const insights = input?.insights ?? [];

	return (
		<ToolCallWrapper
			defaultExpanded={false}
			title={
				<span>
					Recommendation{' '}
					<span className={styles.recordRecommendationToolCallSpan}>{input?.title ?? input?.subjectKey}</span>
				</span>
			}
		>
			{isSettled && input ? (
				<div className={styles.recordRecommendationToolCallDiv}>
					{input.summary && <p className={styles.recordRecommendationToolCallP}>{input.summary}</p>}
					{input.suggestedAction && (
						<p>
							<span className={styles.recordRecommendationToolCallSpan2}>Fix:</span> {input.suggestedAction}
						</p>
					)}
					{input.suggestedFile && (
						<p className={styles.recordRecommendationToolCallP2}>
							File: <code className={styles.recordRecommendationToolCallCode}>{input.suggestedFile}</code>
						</p>
					)}
					{insights.length > 0 && (
						<div className={styles.recordRecommendationToolCallDiv2}>
							{insights.map((insight, index) => (
								<div key={index} className={styles.recordRecommendationToolCallDiv3}>
									<Badge variant='outline'>{insight.signalType}</Badge>
									<span className={styles.recordRecommendationToolCallSpan3}>{insight.metric}</span>
									<span className={styles.recordRecommendationToolCallSpan4}>×{insight.count}</span>
								</div>
							))}
						</div>
					)}
				</div>
			) : (
				<div className={styles.recordRecommendationToolCallDiv4}>Recording recommendation...</div>
			)}
		</ToolCallWrapper>
	);
};
