import { task } from '@quarry/shared/tools';
import { ArrowUpRight } from 'lucide-react';

import type { ToolCallComponentProps } from '.';

import { SubagentLink } from '@/components/subagent/subagent-link';
import { useSubagentDuration } from '@/components/subagent/use-subagent-duration';
import { Spinner } from '@/components/ui/spinner';
import { useToolCallContext } from '@/contexts/tool-call';
import { useIsInToolGroup } from '@/contexts/tool-group';
import { useChatId } from '@/hooks/use-chat-id';
import { useToolCallDensity } from '@/hooks/use-tool-call-density';
import { cn } from '@/lib/utils';
import styles from './task.module.css';

/** A subagent task summarised in the conversation; clicking it opens the run as its own conversation. */
export const TaskToolCall = ({
	toolPart: { input, output, errorText, toolCallId },
}: ToolCallComponentProps<'task'>) => {
	const { isSettled } = useToolCallContext();
	const isInToolGroup = useIsInToolGroup();
	const [density] = useToolCallDensity();
	const chatId = useChatId();
	const duration = useSubagentDuration(output, isSettled);
	const summary: RunSummary = {
		title: taskTitle(input),
		label: subagentLabel(input?.subagent_type),
		prompt: input?.prompt,
		report: output?.report,
		errorText,
		isSettled,
		work: `${isSettled ? 'Worked' : 'Working'}${duration ? ` for ${duration}` : ''}`,
		canOpen: !!chatId,
	};
	const isCompact = density === 'compact' || isInToolGroup;
	const content = isCompact ? <CompactRow summary={summary} /> : <Card summary={summary} />;

	return (
		<div className={cn(!isCompact && styles.taskToolCallDiv)} data-replay-target-id={toolCallId}>
			{chatId ? (
				<SubagentLink chatId={chatId} toolCallId={toolCallId} className={styles.taskToolCallSubagentLink}>
					{content}
				</SubagentLink>
			) : (
				content
			)}
		</div>
	);
};

interface RunSummary {
	title: string;
	label: string;
	prompt: string | undefined;
	report: string | undefined;
	errorText: string | undefined;
	isSettled: boolean;
	work: string;
	canOpen: boolean;
}

const Card = ({ summary }: { summary: RunSummary }) => {
	const hasError = !!summary.errorText;
	return (
		<div
			className={cn(
				`${styles.cardDiv} bg-backgroundSecondary/30`,
				summary.canOpen && styles.cardDiv2,
			)}
		>
			<div className={styles.cardDiv3}>
				<StatusIcon summary={summary} />
				<span className={cn(styles.cardSpan, !summary.isSettled && styles.cardSpan2)}>
					{summary.title}
				</span>
				<span className={styles.cardSpan3}>{summary.work}</span>
				{summary.canOpen && <ArrowUpRight className={styles.cardArrowUpRight} />}
			</div>
			{summary.prompt && <p className={styles.cardP}>{summary.prompt}</p>}
			{hasError ? <p className={styles.cardP2}>{summary.errorText}</p> : null}
		</div>
	);
};

const CompactRow = ({ summary }: { summary: RunSummary }) => {
	return (
		<div className={cn(styles.compactRowDiv, summary.canOpen && styles.compactRowDiv2)}>
			<div className={styles.compactRowDiv3}>
				<LeadingIcon summary={summary} />
			</div>
			<span className={styles.compactRowSpan}>
				<span className={cn(styles.compactRowSpan2, !summary.isSettled && styles.cardSpan2)}>
					{summary.label}
				</span>
				<span className={styles.compactRowSpan3}>{summary.title}</span>
			</span>
		</div>
	);
};

const StatusIcon = ({ summary }: { summary: RunSummary }) => {
	if (!summary.isSettled) {
		return <Spinner className={styles.statusIconSpinner} />;
	}
	if (summary.errorText) {
		return <div className={styles.statusIconDiv} />;
	}
	return null;
};

/** Sits where other tools show their chevron, so compact rows line up in a group. */
const LeadingIcon = ({ summary }: { summary: RunSummary }) => {
	if (!summary.isSettled || summary.errorText) {
		return <StatusIcon summary={summary} />;
	}
	return summary.canOpen ? <ArrowUpRight size={12} strokeWidth={2.5} /> : null;
};

export function subagentLabel(type: task.SubagentType | undefined): string {
	return type ? task.SUBAGENT_LABELS[type] : 'Subagent';
}

/** The task description names the run; before it streams in, fall back to the subagent type. */
export function taskTitle(input: Partial<task.Input> | undefined): string {
	return input?.description || `${subagentLabel(input?.subagent_type)} subagent`;
}
