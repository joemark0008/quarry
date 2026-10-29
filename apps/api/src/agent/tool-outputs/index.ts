import type { ToolResultOutput } from '@ai-sdk/provider-utils';
import type { ReactNode } from 'react';

import { renderToMarkdown } from '../markdown/render-to-markdown.js';

export { DisplayChartOutput } from './display-chart.js';
export { DisplayMapOutput } from './display-map.js';
export { ExecuteSqlOutput } from './execute-sql.js';
export { GrepOutput } from './grep.js';
export { ListOutput } from './list.js';
export { QueryAppDbOutput } from './query-app-db.js';
export { ReadOutput } from './read.js';
export { ReadQueryResultOutput } from './read-query-result.js';
export { SearchOutput } from './search.js';
export { StrReplaceOutput } from './str-replace.js';
export { WriteOutput } from './write.js';

/** Renders a tool output component to markdown for the model, falling back to JSON if the result is empty. */
export function renderToModelOutput(node: ReactNode, fallback: unknown): ToolResultOutput {
	const markdown = renderToMarkdown(node);
	return { type: 'text', value: markdown || JSON.stringify(fallback) };
}
