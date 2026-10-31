import { parseTableBlock, TAG_ATTRS } from '@quarry/shared/story-segments';
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { useMemo } from 'react';
import { StoryTableEmbed } from './story-table-embed';
import { StoryBlockDragGrip, StoryBlockDropZones, useStoryBlockDrag } from './story-editor-block-drag';
import { decodeFromAttr } from './story-editor-utils';
import type { ReactNodeViewProps } from '@tiptap/react';
import { StoryTableFrame } from '@/feature/stories/components/story-block';
import styles from './story-editor-table-block.module.css';

function TableBlockView({ node, editor, getPos }: ReactNodeViewProps) {
	const rawTag = node.attrs.rawTag as string;

	const table = useMemo(() => {
		const attrMatch = rawTag.match(new RegExp(`<table\\s+(${TAG_ATTRS})\\/?>`));
		if (!attrMatch) {
			return null;
		}
		const parsed = parseTableBlock(attrMatch[1]);
		return parsed ? { ...parsed, rawTag } : null;
	}, [rawTag]);
	const { handleDragStart, handleDragEnd } = useStoryBlockDrag({ node, editor, getPos });

	if (!table) {
		return (
			<NodeViewWrapper draggable data-type='table-block'>
				<div className={styles.tableBlockViewDiv}>
					Invalid table block
				</div>
			</NodeViewWrapper>
		);
	}

	return (
		<NodeViewWrapper draggable data-type='table-block'>
			<div className={`${styles.tableBlockViewDiv2} group`} draggable onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
				<StoryBlockDropZones node={node} editor={editor} getPos={getPos} />
				<div contentEditable={false} className={styles.tableBlockViewDiv3}>
					<StoryBlockDragGrip node={node} editor={editor} getPos={getPos} />
				</div>
				<StoryTableFrame>
					<StoryTableEmbed table={table} />
				</StoryTableFrame>
			</div>
		</NodeViewWrapper>
	);
}

export const TableBlock = Node.create({
	name: 'tableBlock',
	group: 'block',
	atom: true,
	selectable: true,
	draggable: true,

	addAttributes() {
		return {
			rawTag: { default: '' },
		};
	},

	parseHTML() {
		return [
			{
				tag: 'table-embed',
				getAttrs(element) {
					if (typeof element === 'string') {
						return false;
					}
					const encoded = element.getAttribute('data-raw') || '';
					return { rawTag: decodeFromAttr(encoded) };
				},
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		return ['table-embed', mergeAttributes(HTMLAttributes)];
	},

	addNodeView() {
		return ReactNodeViewRenderer(TableBlockView);
	},

	renderMarkdown(node) {
		const rawTag = typeof node.attrs?.rawTag === 'string' ? node.attrs.rawTag : '';
		return `${rawTag}\n\n`;
	},
});
