import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { getStoryBlockDragOrigin, hasStoryBlockDrag, STORY_TAB_DRAG_TYPE } from './story-editor-drag-context';
import type { DragOrigin } from './story-block-selection';
import type { DragEvent, KeyboardEvent } from 'react';

import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import styles from './story-tabs-bar.module.css';

export interface StoryTabsExternalDrop {
	onDrop: (origin: DragOrigin, destinationTabIndex: number) => void;
	onTargetActivate: () => void;
}

interface StoryTabsBarProps {
	tabs: Array<{ title: string }>;
	activeIndex: number;
	onSelect: (index: number) => void;
	editable?: {
		onRename: (index: number, title: string) => void;
		onDelete: (index: number) => void;
		onMove: (fromIndex: number, toIndex: number) => void;
		onAdd: () => void;
	};
	externalDrop?: StoryTabsExternalDrop;
	/** Draws the add button with no action, for previews of a story's tab bar. */
	showAddTab?: boolean;
	containerClassName?: string;
	contentClassName?: string;
}

export function StoryTabsBar({
	tabs,
	activeIndex,
	onSelect,
	editable,
	externalDrop,
	showAddTab,
	containerClassName,
	contentClassName,
}: StoryTabsBarProps) {
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [editingTitle, setEditingTitle] = useState('');
	const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
	const [dropSlot, setDropSlot] = useState<number | null>(null);
	const [externalDropIndex, setExternalDropIndex] = useState<number | null>(null);
	const dragIndexRef = useRef<number | null>(null);
	const dropSlotRef = useRef<number | null>(null);

	const clearDragState = useCallback(() => {
		dragIndexRef.current = null;
		dropSlotRef.current = null;
		setDraggingIndex(null);
		setDropSlot(null);
		setExternalDropIndex(null);
	}, []);
	const clearExternalDropState = useCallback(() => {
		setExternalDropIndex(null);
	}, []);

	useEffect(() => {
		document.addEventListener('dragend', clearDragState, true);
		document.addEventListener('drop', clearExternalDropState, true);
		document.addEventListener('drop', clearDragState);
		return () => {
			document.removeEventListener('dragend', clearDragState, true);
			document.removeEventListener('drop', clearExternalDropState, true);
			document.removeEventListener('drop', clearDragState);
		};
	}, [clearDragState, clearExternalDropState]);

	const startRenaming = (index: number) => {
		setEditingIndex(index);
		setEditingTitle(tabs[index].title);
	};

	const finishRenaming = () => {
		if (editingIndex === null) {
			return;
		}
		const title = editingTitle.trim();
		if (title && title !== tabs[editingIndex].title) {
			editable?.onRename(editingIndex, title);
		}
		setEditingIndex(null);
	};

	const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			finishRenaming();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			setEditingIndex(null);
		}
	};

	const handleDragStart = (event: DragEvent<HTMLDivElement>, index: number) => {
		dragIndexRef.current = index;
		setDraggingIndex(index);
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData(STORY_TAB_DRAG_TYPE, String(index));
		event.dataTransfer.setData('text/plain', String(index));
	};

	const handleDragOver = (event: DragEvent<HTMLDivElement>, index: number) => {
		if (event.dataTransfer.types.includes(STORY_TAB_DRAG_TYPE)) {
			if (!editable || dragIndexRef.current === null) {
				return;
			}

			event.preventDefault();
			event.dataTransfer.dropEffect = 'move';
			setExternalDropIndex(null);
			const bounds = event.currentTarget.getBoundingClientRect();
			const slot = event.clientX < bounds.left + bounds.width / 2 ? index : index + 1;
			dropSlotRef.current = slot;
			setDropSlot(slot);
			return;
		}

		if (!externalDrop || index === activeIndex || !hasStoryBlockDrag(event.dataTransfer)) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		event.dataTransfer.dropEffect = 'move';
		externalDrop.onTargetActivate();
		setExternalDropIndex(index);
	};

	const handleDrop = (event: DragEvent<HTMLDivElement>) => {
		if (!event.dataTransfer.types.includes(STORY_TAB_DRAG_TYPE)) {
			return;
		}
		event.preventDefault();
		const fromIndex = dragIndexRef.current;
		const slot = dropSlotRef.current;
		if (fromIndex !== null && slot !== null) {
			const toIndex = slot > fromIndex ? slot - 1 : slot;
			if (toIndex !== fromIndex) {
				editable?.onMove(fromIndex, toIndex);
			}
		}
		clearDragState();
	};

	const handleExternalDrop = (event: DragEvent<HTMLDivElement>, index: number) => {
		if (!externalDrop || index === activeIndex || !hasStoryBlockDrag(event.dataTransfer)) {
			return;
		}

		event.preventDefault();
		externalDrop.onTargetActivate();
		const origin = getStoryBlockDragOrigin(event.dataTransfer);
		if (origin) {
			externalDrop.onDrop(origin, index);
		}
		clearDragState();
	};

	return (
		<div
			className={cn(styles.storyTabsBarDiv, containerClassName ?? styles.storyTabsBarDiv2)}
			onDrop={handleDrop}
			onDragLeave={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
					clearDragState();
				}
			}}
		>
			<div className={styles.storyTabsBarDiv3} />
			<div
				className={cn(
					styles.storyTabsBarDiv4,
					contentClassName,
				)}
			>
				{tabs.map((tab, index) => (
					<Fragment key={`${index}-${tab.title}`}>
						{dropSlot === index && (
							<div className={styles.storyTabsBarDiv5} />
						)}
						<div
							draggable={Boolean(editable) && editingIndex !== index}
							onDragStart={(event) => handleDragStart(event, index)}
							onDragEnd={clearDragState}
							onDragOver={(event) => handleDragOver(event, index)}
							onDrop={(event) => handleExternalDrop(event, index)}
							onDragLeave={(event) => {
								if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
									setExternalDropIndex((current) => (current === index ? null : current));
								}
							}}
							data-story-block-drop-target={externalDropIndex === index ? '' : undefined}
							className={cn(
								`${styles.storyTabsBarDiv6} group/tab`,
								index === activeIndex
									? styles.storyTabsBarDiv7
									: styles.storyTabsBarDiv8,
								draggingIndex === index && styles.storyTabsBarDiv9,
								externalDropIndex === index &&
									styles.storyTabsBarDiv10,
							)}
						>
							{editingIndex === index ? (
								<Input
									autoFocus
									value={editingTitle}
									onChange={(event) => setEditingTitle(event.target.value)}
									onBlur={finishRenaming}
									onKeyDown={handleRenameKeyDown}
									className={styles.storyTabsBarInput}
								/>
							) : (
								<button
									type='button'
									onClick={() => onSelect(index)}
									onDoubleClick={() => editable && startRenaming(index)}
									className={cn(
										`${styles.storyTabsBarButton} quarry-story-tab`,
										editable ? styles.storyTabsBarButton2 : styles.storyTabsBarButton3,
									)}
								>
									{tab.title || 'Untitled'}
								</button>
							)}

							{editable && editingIndex !== index && (
								<div className={styles.storyTabsBarDiv11}>
									<Dialog>
										<DialogTrigger asChild>
											<Button
												type='button'
												variant='ghost'
												size='icon-xs'
												aria-label={`Delete ${tab.title || 'tab'}`}
											>
												<X />
											</Button>
										</DialogTrigger>
										<DialogContent>
											<DialogHeader>
												<DialogTitle>Delete this tab?</DialogTitle>
											</DialogHeader>
											<p className={styles.storyTabsBarP}>
												The tab and all of its content will be removed.
											</p>
											<div className={styles.storyTabsBarDiv12}>
												<DialogClose asChild>
													<Button variant='outline' className={styles.storyTabsBarButton4}>
														Cancel
													</Button>
												</DialogClose>
												<DialogClose asChild>
													<Button
														variant='destructive'
														className={styles.storyTabsBarButton5}
														onClick={() => editable.onDelete(index)}
													>
														Delete
													</Button>
												</DialogClose>
											</div>
										</DialogContent>
									</Dialog>
								</div>
							)}
						</div>
					</Fragment>
				))}

				{dropSlot === tabs.length && (
					<div className={styles.storyTabsBarDiv5} />
				)}

				{(editable || showAddTab) && (
					<button
						type='button'
						aria-label='Add tab'
						aria-hidden={editable ? undefined : true}
						tabIndex={editable ? undefined : -1}
						onClick={editable?.onAdd}
						className={cn(
							styles.storyTabsBarButton6,
							editable ? styles.storyTabsBarButton7 : styles.storyTabsBarButton8,
						)}
					>
						<Plus className={styles.storyTabsBarPlus} />
					</button>
				)}
			</div>
		</div>
	);
}
