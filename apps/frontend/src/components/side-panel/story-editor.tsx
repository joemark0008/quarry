import { DragHandle } from '@tiptap/extension-drag-handle-react';
import { EditorContent } from '@tiptap/react';
import { memo } from 'react';
import { StoryBlockActionGrip } from './story-editor-block-drag';
import { getStoryEditorMarkdown } from './story-editor-utils';
import { useStoryEditor } from './hooks/use-story-editor';
import { BlockSelectionContext, SelectedBlockPositionsContext } from './story-block-selection-context';
import { GridDragContext, StoryBlockDragContext } from './story-editor-drag-context';
import type { StoryEditorDragControls } from './story-editor-drag-context';
import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';
import styles from './story-editor.module.css';

export { preprocessForEditor } from './story-editor-utils';
export { StoryBlockDragGrip, StoryBlockDropZones } from './story-editor-block-drag';

interface StoryEditorProps {
	code: string;
	editorRef: React.MutableRefObject<Editor | null>;
	onSave?: () => void;
	onDragControlsChange?: (controls: StoryEditorDragControls | null) => void;
	onChange?: (code: string) => void;
}

export const StoryEditor = memo(function StoryEditor({
	code,
	editorRef,
	onSave,
	onDragControlsChange,
	onChange,
}: StoryEditorProps) {
	const {
		editor,
		gridDragSourceRef,
		storyBlockDragContext,
		selectedGridColumns,
		selectedBlocks,
		handleDragHandleNodeChange,
		handleNodeType,
		storyEditorRef,
		onElementDragStart,
		onElementDragEnd,
		getDragHandleOrigin,
	} = useStoryEditor({ code, editorRef, onSave, onDragControlsChange, onChange });

	const hideFloatingHandle =
		handleNodeType === 'gridBlock' ||
		handleNodeType === 'chartBlock' ||
		handleNodeType === 'tableBlock' ||
		handleNodeType === 'mapBlock';

	return (
		<GridDragContext.Provider value={gridDragSourceRef}>
			<StoryBlockDragContext.Provider value={storyBlockDragContext}>
				<div
					ref={storyEditorRef}
					className={cn(
						`${styles.storyEditorDiv} story-editor`,
						storyBlockDragContext.activeDropZone && 'drop-indicator-active',
					)}
				>
					{editor && (
						<DragHandle
							editor={editor}
							className={cn('drag-handle', hideFloatingHandle && styles.storyEditorDragHandle)}
							onNodeChange={handleDragHandleNodeChange}
							onElementDragStart={onElementDragStart}
							onElementDragEnd={onElementDragEnd}
						>
							<StoryBlockActionGrip
								editor={editor}
								getOrigin={getDragHandleOrigin}
								ariaLabel='Move story block'
								iconClassName={styles.storyEditorStoryBlockActionGrip}
								lockHandleWhileOpen
								wrapperClassName={cn('drag-handle-button', hideFloatingHandle && styles.storyEditorStoryBlockActionGrip2)}
							/>
						</DragHandle>
					)}
					<BlockSelectionContext.Provider value={selectedGridColumns}>
						<SelectedBlockPositionsContext.Provider value={selectedBlocks}>
							<EditorContent editor={editor} />
						</SelectedBlockPositionsContext.Provider>
					</BlockSelectionContext.Provider>
				</div>
			</StoryBlockDragContext.Provider>
		</GridDragContext.Provider>
	);
});

export function getEditorMarkdown(editor: Editor): string {
	return getStoryEditorMarkdown(editor);
}
