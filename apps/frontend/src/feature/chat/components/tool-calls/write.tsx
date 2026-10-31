import { HardDriveDownload } from 'lucide-react';
import { ToolCallWrapper } from './tool-call-wrapper';
import styles from './write.module.css';
import type { ToolCallComponentProps } from '.';
import { formatBytes } from '@/lib/utils';
import { useToolCallContext } from '@/contexts/tool-call';

export const WriteToolCall = ({ toolPart: { output, input } }: ToolCallComponentProps<'write'>) => {
	const { isSettled } = useToolCallContext();

	const filePath = output?.path ?? input?.file_path;
	const fileName = filePath?.split('/').pop() ?? filePath;

	return (
		<ToolCallWrapper
			title={
				<>
					<HardDriveDownload size={13} className={styles.writeToolCallHardDriveDownload} />
					{isSettled ? 'Saved' : 'Saving...'} <code className={styles.writeToolCallCode}>{fileName}</code>
					{' to your files'}
				</>
			}
			badge={output && formatBytes(output.size)}
		>
			{input?.content !== undefined && (
				<div className={styles.writeToolCallDiv}>
					{filePath && <div className={styles.writeToolCallDiv2}>{filePath}</div>}
					<pre className={styles.writeToolCallPre}>{input.content}</pre>
				</div>
			)}
		</ToolCallWrapper>
	);
};
