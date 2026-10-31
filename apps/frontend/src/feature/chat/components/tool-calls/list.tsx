import { File, Folder, Link } from 'lucide-react';
import { ToolCallWrapper } from './tool-call-wrapper';
import { McpTitle } from './mcp-title';
import styles from './list.module.css';
import type { ToolCallComponentProps } from '.';
import type { McpTarget } from '@/lib/mcp';
import { getMcpTarget } from '@/lib/mcp';
import { formatBytes } from '@/lib/utils';
import { useToolCallContext } from '@/contexts/tool-call';

const getIcon = (type?: string) => {
	switch (type) {
		case 'directory':
			return <Folder size={14} className={styles.getIconFolder} />;
		case 'symbolic_link':
			return <Link size={14} className={styles.getIconLink} />;
		default:
			return <File size={14} className={styles.getIconFile} />;
	}
};

const McpListTitle = ({ target, isSettled }: { target: McpTarget; isSettled: boolean }) => (
	<McpTitle server={target.server}>
		{isSettled ? 'Listed' : 'Listing...'} {target.server ? `${target.server} MCP tools` : 'MCP servers'}
	</McpTitle>
);

export const ListToolCall = ({ toolPart }: ToolCallComponentProps<'list'>) => {
	const { isSettled } = useToolCallContext();
	const output = toolPart.output;
	const input = toolPart.input;
	const entries = Array.isArray(output) ? output : output?.entries || [];
	const mcpTarget = getMcpTarget(input?.path);

	if (!isSettled) {
		return (
			<ToolCallWrapper
				title={
					mcpTarget ? (
						<McpListTitle target={mcpTarget} isSettled={false} />
					) : (
						<>
							Listing... <code className={styles.listToolCallCode}>{input?.path}</code>
						</>
					)
				}
				children={<div className={styles.listToolCallDiv}>Listing...</div>}
			/>
		);
	}

	return (
		<ToolCallWrapper
			title={
				mcpTarget ? (
					<McpListTitle target={mcpTarget} isSettled={true} />
				) : (
					<>
						Listed <code className={styles.listToolCallCode2}>{input?.path}</code>
					</>
				)
			}
			badge={entries && `${entries.length} items`}
		>
			{output && (
				<div className={styles.listToolCallDiv2}>
					<div className={styles.listToolCallDiv3}>
						{entries.map((item, index) => (
							<div key={index} className={styles.listToolCallDiv4}>
								{getIcon(item.type)}
								<span className={styles.listToolCallSpan}>{item.name}</span>
								{item.description && (
									<span className={styles.listToolCallSpan2}>{item.description}</span>
								)}
								{item.type === 'directory' && item.itemCount !== undefined && (
									<span className={styles.listToolCallSpan3}>
										{item.itemCount} {item.itemCount === 1 ? 'item' : 'items'}
									</span>
								)}
								{item.size && (
									<span className={styles.listToolCallSpan3}>{formatBytes(Number(item.size))}</span>
								)}
							</div>
						))}
					</div>
					{entries.length === 0 && <div className={styles.listToolCallDiv}>Empty directory</div>}
				</div>
			)}
		</ToolCallWrapper>
	);
};
