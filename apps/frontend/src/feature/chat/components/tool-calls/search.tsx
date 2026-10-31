import { File } from 'lucide-react';
import { ToolCallWrapper } from './tool-call-wrapper';
import styles from './search.module.css';
import type { ToolCallComponentProps } from '.';
import { formatBytes } from '@/lib/utils';
import { useToolCallContext } from '@/contexts/tool-call';

export const SearchToolCall = ({ toolPart: { output, input } }: ToolCallComponentProps<'search'>) => {
	const { isSettled } = useToolCallContext();
	const files = Array.isArray(output) ? output : output?.files || [];

	if (!isSettled) {
		return (
			<ToolCallWrapper
				title={
					<>
						Searching <code className={styles.searchToolCallCode}>{input?.pattern}</code>
					</>
				}
				children={<div className={styles.searchToolCallDiv}>Searching...</div>}
			/>
		);
	}

	return (
		<ToolCallWrapper
			title={
				<>
					Searched <code className={styles.searchToolCallCode}>{input?.pattern}</code>
				</>
			}
			badge={files && `(${files.length} files)`}
		>
			{output && (
				<div className={styles.searchToolCallDiv2}>
					<div className={styles.searchToolCallDiv3}>
						{files.map((item, index) => (
							<div key={index} className={styles.searchToolCallDiv4}>
								<File size={14} className={styles.searchToolCallFile} />
								<div className={styles.searchToolCallDiv5}>
									<span className={styles.searchToolCallSpan}>{item.path}</span>
								</div>
								{item.size && (
									<span className={styles.searchToolCallSpan2}>{formatBytes(Number(item.size))}</span>
								)}
							</div>
						))}
					</div>
					{files.length === 0 && <div className={styles.searchToolCallDiv}>No files found</div>}
				</div>
			)}
		</ToolCallWrapper>
	);
};
