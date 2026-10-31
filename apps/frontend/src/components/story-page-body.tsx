import { useRef } from 'react';
import { parseStoryTabs } from '@quarry/shared/story-tabs';
import type { ReactNode } from 'react';
import type { StoryTheme } from '@quarry/shared/story-theme';

import type { QueryDataMap } from '@/components/story-embeds';
import type { useStoryPageEditor } from '@/hooks/use-story-page-editor';
import { useDragAutoScroll } from '@/hooks/use-drag-auto-scroll';
import { StoryCodeView } from '@/components/side-panel/story-code-view';
import { StoryEditor } from '@/components/side-panel/story-editor';
import { StoryTabbedEditor } from '@/components/side-panel/story-tabbed-editor';
import { StoryUnsavedChangesDialog } from '@/components/story-unsaved-changes-dialog';
import { StoryThemeProvider } from '@/components/story-theme-provider';
import { StoryEmbedDataProvider } from '@/contexts/story-embed-data';
import styles from './story-page-body.module.css';

interface StoryPageBodyProps {
	editor: ReturnType<typeof useStoryPageEditor>;
	preview: ReactNode;
	queryData?: QueryDataMap | null;
	theme?: StoryTheme | null;
}

export function StoryPageBody({ editor, preview, queryData, theme }: StoryPageBodyProps) {
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
	useDragAutoScroll(scrollContainerRef);
	const unsavedChangesDialog = <StoryUnsavedChangesDialog {...editor.exitDialog} />;

	if (editor.viewMode === 'edit') {
		const editCode = editor.editCode;
		const tabs = parseStoryTabs(editCode);
		const isTabbed = Boolean(tabs?.length);
		return (
			<>
				<StoryEmbedDataProvider value={queryData ?? null}>
					<StoryThemeProvider
						theme={theme ?? null}
						className={styles.storyPageBodyStoryThemeProvider}
					>
						<div ref={scrollContainerRef} className={styles.storyPageBodyDiv}>
							{isTabbed ? (
								<StoryTabbedEditor
									code={editCode}
									editorRef={editor.tiptapEditorRef}
									onSave={editor.handleSave}
									onChange={editor.onEditCodeChange}
									getCodeRef={editor.tabbedEditCodeRef}
									barContentClassName={styles.storyPageBodyStoryTabbedEditor}
									contentClassName={styles.storyPageBodyStoryTabbedEditor2}
								/>
							) : (
								<div className={styles.storyPageBodyDiv2}>
									<StoryEditor
										code={editCode}
										editorRef={editor.tiptapEditorRef}
										onSave={editor.handleSave}
										onChange={editor.onEditCodeChange}
									/>
								</div>
							)}
						</div>
					</StoryThemeProvider>
				</StoryEmbedDataProvider>
				{unsavedChangesDialog}
			</>
		);
	}

	if (editor.viewMode === 'code') {
		const codeDraft = editor.codeDraft;
		return (
			<>
				<div className={styles.storyPageBodyDiv3}>
					<StoryCodeView
						code={codeDraft}
						codeRef={editor.codeViewRef}
						onCodeChange={editor.onCodeChange}
						onValidChange={editor.setIsCodeValid}
						onSave={editor.handleSave}
					/>
				</div>
				{unsavedChangesDialog}
			</>
		);
	}

	return (
		<>
			{preview}
			{unsavedChangesDialog}
		</>
	);
}
