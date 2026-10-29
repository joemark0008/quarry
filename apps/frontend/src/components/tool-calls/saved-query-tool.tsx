import { QUERY_TOOL_NAME_PREFIX } from '@quarry/shared/query-tools';
import { SqlToolCallView } from './execute-sql';
import type { savedQueryTool } from '@quarry/shared/tools';
import type { ToolCallComponentProps } from '.';

import { getToolName } from '@/lib/ai';
import { savedQueryToolAsSql } from '@/lib/execute-sql-messages';

/** A saved query tool's call (`qt_<name>`): the `execute_sql` view, titled with the tool and its arguments. */
export const SavedQueryToolCall = ({ toolPart }: ToolCallComponentProps) => {
	const output = toolPart.output as savedQueryTool.Output | undefined;
	const args = (toolPart.input ?? {}) as Record<string, unknown>;
	const name = getToolName(toolPart).slice(QUERY_TOOL_NAME_PREFIX.length);
	const subtitle = Object.entries(args)
		.map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
		.join(', ');
	return (
		<SqlToolCallView
			input={output?.query_tool ? savedQueryToolAsSql(output).input : undefined}
			output={output}
			state={toolPart.state}
			toolCallId={toolPart.toolCallId}
			label={name}
			subtitle={subtitle || 'saved query'}
		/>
	);
};
