import { ToolCallWrapper } from './tool-call-wrapper';
import { TableDisplay } from './display-table';
import styles from './read-query-result.module.css';
import type { readQueryResult } from '@quarry/shared/tools';
import type { ToolCallComponentProps } from '.';
import { useToolCallContext } from '@/contexts/tool-call';

export const ReadQueryResultToolCall = ({
	toolPart: { output, input },
}: ToolCallComponentProps<'read_query_result'>) => {
	const { isSettled } = useToolCallContext();

	const queryId = input?.query_id;

	if (!isSettled) {
		return (
			<ToolCallWrapper
				title={
					<>
						Reading rows from <code className={styles.readQueryResultToolCallCode}>{queryId}</code>...
					</>
				}
			/>
		);
	}

	const rangeLabel = output ? getRangeLabel(output) : undefined;

	return (
		<ToolCallWrapper
			title={
				<>
					Read rows from <code className={styles.readQueryResultToolCallCode}>{queryId}</code>
				</>
			}
			badge={rangeLabel}
		>
			{output && (
				<TableDisplay
					data={output.data as Record<string, unknown>[]}
					columns={output.columns}
					tableContainerClassName={styles.readQueryResultToolCallTableDisplay}
					showRowCount={false}
				/>
			)}
		</ToolCallWrapper>
	);
};

const getRangeLabel = (output: readQueryResult.Output) => {
	if (output.data.length === 0) {
		return `0 rows of ${output.row_count}`;
	}

	return `rows ${output.offset + 1}–${output.offset + output.data.length} of ${output.row_count}`;
};
