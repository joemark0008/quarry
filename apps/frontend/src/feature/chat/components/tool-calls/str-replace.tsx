import { FilePenLine } from 'lucide-react';
import { ToolCallWrapper } from './tool-call-wrapper';
import styles from './str-replace.module.css';
import type { ToolCallComponentProps } from '.';
import { useToolCallContext } from '@/contexts/tool-call';

export const StrReplaceToolCall = ({ toolPart: { output, input } }: ToolCallComponentProps<'str_replace'>) => {
	const { isSettled } = useToolCallContext();

	const filePath = output?.path ?? input?.file_path;
	const fileName = filePath?.split('/').pop() ?? filePath;

	return (
		<ToolCallWrapper
			title={
				<>
					<FilePenLine size={13} className={styles.strReplaceToolCallFilePenLine} />
					{isSettled ? 'Edited' : 'Editing...'}{' '}
					<code className={styles.strReplaceToolCallCode}>{fileName}</code>
				</>
			}
			badge={output && formatReplacements(output.replacements)}
		>
			{input?.old_string !== undefined && (
				<div className={styles.strReplaceToolCallDiv}>
					{filePath && <div className={styles.strReplaceToolCallDiv2}>{filePath}</div>}
					<DiffLines text={input.old_string} kind='removed' />
					{input.new_string !== undefined && <DiffLines text={input.new_string} kind='added' />}
				</div>
			)}
		</ToolCallWrapper>
	);
};

const DiffLines = ({ text, kind }: { text: string; kind: 'removed' | 'added' }) => {
	const marker = kind === 'removed' ? '-' : '+';
	const tone = kind === 'removed' ? styles.state100 : styles.state101;

	return (
		<pre className={`${styles.diffLinesPre} ${tone}`}>
			{text.split('\n').map((line, index) => (
				<div key={index}>
					<span className={styles.diffLinesSpan}>{marker}</span>
					{line}
				</div>
			))}
		</pre>
	);
};

const formatReplacements = (count: number): string => {
	return count === 1 ? '1 replacement' : `${count} replacements`;
};
