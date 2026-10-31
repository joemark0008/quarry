import { useState } from 'react';
import { Streamdown } from 'streamdown';
import { executeSandboxedCode } from '@quarry/shared/tools';
import { Box, Code, Copy, Cpu, Database, Package, Save, Terminal } from 'lucide-react';
import { ToolCallWrapper } from './tool-call-wrapper';
import type { ToolCallComponentProps } from '.';
import { useToolCallContext } from '@/contexts/tool-call';
import { cn } from '@/lib/utils';
import styles from './execute-sandboxed-code.module.css';

type ViewMode = 'output' | 'code';

export const ExecuteSandboxedCodeToolCall = ({
	toolPart: { output, input },
}: ToolCallComponentProps<'execute_sandboxed_code'>) => {
	const [viewMode, setViewMode] = useState<ViewMode>('output');
	const { isSettled } = useToolCallContext();

	const language = input?.language ?? 'python';
	const exitCode = output?.exitCode ?? null;
	const hasError = exitCode !== null && exitCode !== 0;
	const packages = input?.packages;
	const dataFiles = input?.data_files;

	const actions = [
		{
			id: 'output',
			label: <Terminal className={styles.actionsTerminal} strokeWidth={2.25} />,
			isActive: viewMode === 'output',
			onClick: () => setViewMode('output'),
			title: 'View output',
		},
		{
			id: 'code',
			label: <Code className={styles.actionsTerminal} strokeWidth={2.25} />,
			isActive: viewMode === 'code',
			onClick: () => setViewMode('code'),
			title: 'View code',
		},
		{
			id: 'copy',
			label: <Copy className={styles.actionsTerminal} strokeWidth={2.25} />,
			onClick: () => {
				navigator.clipboard.writeText(input?.code ?? '');
			},
			title: 'Copy code',
		},
	];

	const codePreview = input?.code ? (input.code.length > 50 ? `${input.code.slice(0, 50)}...` : input.code) : '';

	const vmSize = input?.vm_size ?? 'xxs';
	const vmSpecs = executeSandboxedCode.VM_SIZE_SPECS[vmSize];
	const sandboxId = output?.sandbox_id;
	const savedFiles = output?.saved_files;

	const setupInfo = [
		...(packages?.length ? [`${packages.length} pkg${packages.length > 1 ? 's' : ''}`] : []),
		...(dataFiles?.length ? [`${dataFiles.length} file${dataFiles.length > 1 ? 's' : ''}`] : []),
	].join(', ');

	return (
		<ToolCallWrapper
			defaultExpanded={false}
			overrideError={viewMode === 'code'}
			title={
				<span className={styles.executeSandboxedCodeToolCallSpan}>
					<Box size={12} className={styles.executeSandboxedCodeToolCallBox} />
					{isSettled ? 'Ran' : 'Running'} {language}{' '}
					<span className={styles.executeSandboxedCodeToolCallSpan2}>{codePreview.replace(/\n/g, ' ')}</span>
				</span>
			}
			badge={
				isSettled && exitCode !== null ? (
					<span className={cn(hasError ? styles.executeSandboxedCodeToolCallSpan3 : styles.executeSandboxedCodeToolCallSpan4)}>exit {exitCode}</span>
				) : undefined
			}
			actions={isSettled ? actions : []}
		>
			{viewMode === 'code' ? (
				<div className={styles.executeSandboxedCodeToolCallDiv}>
					{!!(packages?.length || dataFiles?.length) && (
						<div className={styles.executeSandboxedCodeToolCallDiv2}>
							{!!packages?.length && (
								<span className={styles.executeSandboxedCodeToolCallSpan5}>
									<Package size={10} />
									{packages.join(', ')}
								</span>
							)}
							{!!dataFiles?.length && (
								<span className={styles.executeSandboxedCodeToolCallSpan5}>
									<Database size={10} />
									{dataFiles.map((f) => f?.filename).join(', ')}
								</span>
							)}
						</div>
					)}
					{input?.code && (
						<div className='hide-code-header'>
							<Streamdown mode='static' controls={{ code: false }}>
								{`\`\`\`${language}\n${input.code}\n\`\`\``}
							</Streamdown>
						</div>
					)}
				</div>
			) : output ? (
				<div className={styles.executeSandboxedCodeToolCallDiv}>
					{(setupInfo || sandboxId) && (
						<div className={styles.executeSandboxedCodeToolCallDiv3}>
							{setupInfo && <span>{setupInfo}</span>}
							<span className={styles.executeSandboxedCodeToolCallSpan5}>
								<Cpu size={10} />
								{vmSize.toUpperCase()} · {vmSpecs.memoryMib}MB · {vmSpecs.cpus}cpu
							</span>
							{sandboxId && (
								<span className={styles.executeSandboxedCodeToolCallSpan6} title={sandboxId}>
									{sandboxId}
								</span>
							)}
						</div>
					)}
					{output.stdout && (
						<pre className={`${styles.executeSandboxedCodeToolCallPre} hide-code-header`}>
							<Streamdown mode='static' controls={{ code: false }}>
								{`\`\`\`\n${output.stdout}\n\`\`\``}
							</Streamdown>
						</pre>
					)}
					{output.stderr && (
						<pre className={`${styles.executeSandboxedCodeToolCallPre2} hide-code-header`}>
							<Streamdown mode='static' controls={{ code: false }}>
								{`\`\`\`\n${output.stderr}\n\`\`\``}
							</Streamdown>
						</pre>
					)}
					{!!savedFiles?.length && (
						<div className={styles.executeSandboxedCodeToolCallDiv4}>
							{savedFiles.map((savedPath) => (
								<span key={savedPath} className={styles.executeSandboxedCodeToolCallSpan7}>
									<Save size={10} className={styles.executeSandboxedCodeToolCallSave} />
									<span className={styles.executeSandboxedCodeToolCallSpan8}>{savedPath}</span>
								</span>
							))}
						</div>
					)}
					{!output.stdout && !output.stderr && !savedFiles?.length && (
						<div className={styles.executeSandboxedCodeToolCallDiv5}>No output</div>
					)}
				</div>
			) : (
				<div className={styles.executeSandboxedCodeToolCallDiv5}>Running in sandbox...</div>
			)}
		</ToolCallWrapper>
	);
};
