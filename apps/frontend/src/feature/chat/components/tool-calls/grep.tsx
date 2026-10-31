import { FileSearch, AlertCircle } from 'lucide-react';
import { useToolCallContext } from '@/contexts/tool-call';
import { ToolCallWrapper } from './tool-call-wrapper';
import type { ToolCallComponentProps } from '.';
import styles from './grep.module.css';

export const GrepToolCall = ({ toolPart: { output, input } }: ToolCallComponentProps<'grep'>) => {
	const { isSettled } = useToolCallContext();

	if (!isSettled) {
		return (
			<ToolCallWrapper
				title={
					<>
						Searching for{' '}
						<code className={styles.grepToolCallCode}>{input?.pattern}</code>
					</>
				}
				children={<div className={styles.grepToolCallDiv}>Searching...</div>}
			/>
		);
	}

	const badge = output
		? output.truncated
			? `(${output.matches.length}+ of ${output.total_matches} matches)`
			: `(${output.total_matches} matches)`
		: undefined;

	return (
		<ToolCallWrapper
			title={
				<>
					Grepped{' '}
					<code className={styles.grepToolCallCode}>{input?.pattern}</code>
					{input?.glob && (
						<span className={styles.grepToolCallSpan}>
							in <code className={styles.grepToolCallCode2}>{input.glob}</code>
						</span>
					)}
				</>
			}
			badge={badge}
		>
			{output && (
				<div className={styles.grepToolCallDiv2}>
					{output.truncated && (
						<div className={styles.grepToolCallDiv3}>
							<AlertCircle size={14} className={styles.grepToolCallAlertCircle} />
							<span className={styles.grepToolCallSpan2}>
								Results truncated. Showing {output.matches.length} of {output.total_matches} matches.
							</span>
						</div>
					)}

					<div className={styles.grepToolCallDiv4}>
						{output.matches.map((match, index) => (
							<div key={index} className={styles.grepToolCallDiv5}>
								{/* File header */}
								<div className={styles.grepToolCallDiv6}>
									<FileSearch size={12} className={styles.grepToolCallFileSearch} />
									<span className={styles.grepToolCallSpan3}>
										{match.path}
									</span>
									<span className={styles.grepToolCallSpan4}>
										:{match.line_number}
									</span>
								</div>

								{/* Context before */}
								{match.context_before && match.context_before.length > 0 && (
									<div className={styles.grepToolCallDiv7}>
										{match.context_before.map((line, contextIndex) => {
											const contextLine = normalizeContextLine(
												line,
												match.line_number - match.context_before!.length + contextIndex,
											);
											return (
												<div
													key={`${contextLine.line_number}-${contextIndex}`}
													className={styles.grepToolCallDiv8}
												>
													<span className={styles.grepToolCallSpan5}>
														{contextLine.line_number}
													</span>
													{contextLine.line_content}
												</div>
											);
										})}
									</div>
								)}

								{/* Match line */}
								<div className={styles.grepToolCallDiv9}>
									<div className={styles.grepToolCallDiv10}>
										<span className={styles.grepToolCallSpan6}>
											{match.line_number}
										</span>
										<HighlightedLine content={match.line_content} pattern={input?.pattern} />
									</div>
								</div>

								{/* Context after */}
								{match.context_after && match.context_after.length > 0 && (
									<div className={styles.grepToolCallDiv7}>
										{match.context_after.map((line, contextIndex) => {
											const contextLine = normalizeContextLine(
												line,
												match.line_number + 1 + contextIndex,
											);
											return (
												<div
													key={`${contextLine.line_number}-${contextIndex}`}
													className={styles.grepToolCallDiv8}
												>
													<span className={styles.grepToolCallSpan5}>
														{contextLine.line_number}
													</span>
													{contextLine.line_content}
												</div>
											);
										})}
									</div>
								)}
							</div>
						))}
					</div>

					{output.matches.length === 0 && (
						<div className={styles.grepToolCallDiv}>No matches found</div>
					)}
				</div>
			)}
		</ToolCallWrapper>
	);
};

const normalizeContextLine = (
	line: string | { line_number: number; line_content: string },
	fallbackLineNumber: number,
) => {
	return typeof line === 'string' ? { line_number: fallbackLineNumber, line_content: line } : line;
};

/**
 * Highlights the matching pattern in the line content
 */
const HighlightedLine = ({ content, pattern }: { content: string; pattern?: string }) => {
	if (!pattern) {
		return <span>{content}</span>;
	}

	try {
		const regex = new RegExp(`(${pattern})`, 'gi');
		const parts = content.split(regex);

		return (
			<>
				{parts.map((part, i) => {
					const isMatch = regex.test(part);
					// Reset regex lastIndex after test
					regex.lastIndex = 0;
					return isMatch ? (
						<mark key={i} className={styles.highlightedLineMark}>
							{part}
						</mark>
					) : (
						<span key={i}>{part}</span>
					);
				})}
			</>
		);
	} catch {
		// If the pattern is not a valid regex for JS, just show the content
		return <span>{content}</span>;
	}
};
