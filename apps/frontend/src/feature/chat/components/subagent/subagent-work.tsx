import { Check, Minus, X } from 'lucide-react';
import { useState } from 'react';
import { useSubagentDuration } from './use-subagent-duration';
import styles from './subagent-work.module.css';
import type { task } from '@quarry/shared/tools';
import { Expandable } from '@/components/ui/expandable';
import { Spinner } from '@/components/ui/spinner';

/** The tool calls a subagent made, folded behind a one-line "Worked for …" summary. */
export function SubagentWork({ output, isSettled }: { output: task.Output | undefined; isSettled: boolean }) {
	const [isExpanded, setIsExpanded] = useState(false);
	const duration = useSubagentDuration(output, isSettled);
	const steps = output?.steps ?? [];
	const title = `${isSettled ? 'Worked' : 'Working'}${duration ? ` for ${duration}` : ''}`;

	return (
		<Expandable
			title={title}
			expanded={isExpanded}
			onExpandedChange={setIsExpanded}
			disabled={steps.length === 0}
			isLoading={!isSettled}
			variant='inline'
		>
			<ol className={styles.subagentWorkOl}>
				{steps.map((step, index) => (
					<li key={index} className={styles.subagentWorkLi}>
						<StepStatusIcon status={stepDisplayStatus(step, isSettled)} />
						<span className={styles.subagentWorkSpan}>{step.tool}</span>
						<span className={styles.subagentWorkSpan2}>{step.summary}</span>
					</li>
				))}
			</ol>
		</Expandable>
	);
}

type StepDisplayStatus = task.Step['status'] | 'interrupted';

/** A step still marked running once the run has settled never finished: the run failed or was stopped mid-call. */
function stepDisplayStatus(step: task.Step, isSettled: boolean): StepDisplayStatus {
	return isSettled && step.status === 'running' ? 'interrupted' : step.status;
}

const StepStatusIcon = ({ status }: { status: StepDisplayStatus }) => {
	switch (status) {
		case 'running':
			return <Spinner className={styles.stepStatusIconSpinner} />;
		case 'interrupted':
			return <Minus size={12} className={styles.stepStatusIconMinus} />;
		case 'done':
			return <Check size={12} className={styles.stepStatusIconMinus} />;
		case 'error':
			return <X size={12} className={styles.stepStatusIconX} />;
	}
};
