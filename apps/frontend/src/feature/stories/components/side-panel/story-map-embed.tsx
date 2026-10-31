import { FoldHorizontal, Pencil, UnfoldHorizontal } from 'lucide-react';
import { memo, useMemo, useRef, useState } from 'react';
import { mapBlockToInput } from '@quarry/shared/story-segments';
import { StoryEmbedFallback } from './story-embed-fallback';
import type { ParsedMapBlock } from '@quarry/shared/story-segments';

import { StoryMapRender } from '@/feature/stories/components/story-map-embed';
import { MapConfigEditDialog } from '@/feature/chat/components/tool-calls/display-map-edit-dialog';
import { Button } from '@/components/ui/button';
import { useStoryEmbedData } from '@/contexts/story-embed-data';
import { useIsInStoryGrid } from '@/contexts/story-grid';
import { useStoryMapEdit } from '@/contexts/story-map-edit';
import { useBreakoutStyle } from '@/hooks/use-breakout-width';
import { useSourceQuery } from '@/hooks/use-source-query';
import { cn } from '@/lib/utils';
import styles from './story-map-embed.module.css';

export const StoryMapEmbed = memo(function StoryMapEmbed({
	map,
	dragHandle,
}: {
	map: ParsedMapBlock;
	dragHandle?: React.ReactNode;
}) {
	const embedData = useStoryEmbedData();
	const embedSourceData = embedData?.[map.queryId];
	const { sourceData: agentSourceData } = useSourceQuery(embedSourceData ? undefined : map.queryId);
	const sourceData = embedSourceData ?? agentSourceData;

	if (!sourceData?.data || sourceData.data.length === 0) {
		return (
			<StoryEmbedFallback dragHandle={dragHandle}>Map data unavailable (query: {map.queryId})</StoryEmbedFallback>
		);
	}

	return (
		<StoryMapEmbedShell map={map} dragHandle={dragHandle}>
			<StoryMapRender map={map} data={sourceData.data} />
		</StoryMapEmbedShell>
	);
});

interface StoryMapEmbedShellProps {
	map: ParsedMapBlock;
	dragHandle?: React.ReactNode;
	allowExpand?: boolean;
	children: React.ReactNode;
}

export function StoryMapEmbedShell({ map, dragHandle, allowExpand = false, children }: StoryMapEmbedShellProps) {
	const edit = useStoryMapEdit();
	const isInGrid = useIsInStoryGrid();
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const slotRef = useRef<HTMLDivElement>(null);
	const canExpand = allowExpand && !isInGrid;
	const breakoutStyle = useBreakoutStyle(slotRef, canExpand && isExpanded);
	const config = useMemo(() => mapBlockToInput(map), [map]);
	const canEdit = Boolean(edit && map.rawTag);
	const showHeader = Boolean(map.title || dragHandle || canEdit || canExpand);

	return (
		<div ref={slotRef} className={styles.storyMapEmbedShellDiv}>
			<div className={styles.storyMapEmbedShellDiv2} style={breakoutStyle}>
				{showHeader && (
					<div className={styles.storyMapEmbedShellDiv3}>
						{map.title ? (
							<span className={styles.storyMapEmbedShellSpan}>
								{map.title}
							</span>
						) : (
							<div className={styles.storyMapEmbedShellDiv4} />
						)}
						<div className={styles.storyMapEmbedShellDiv5}>
							{dragHandle}
							{canExpand && (
								<Button
									variant='ghost-muted'
									size='icon-xs'
									onClick={() => setIsExpanded((value) => !value)}
									title={isExpanded ? 'Collapse width' : 'Expand width'}
									className={cn(
										styles.storyMapEmbedShellButton,
										isExpanded && styles.storyMapEmbedShellButton2,
									)}
								>
									{isExpanded ? (
										<FoldHorizontal className={styles.storyMapEmbedShellFoldHorizontal} />
									) : (
										<UnfoldHorizontal className={styles.storyMapEmbedShellFoldHorizontal} />
									)}
								</Button>
							)}
							{canEdit && (
								<Button
									variant='ghost-muted'
									size='icon-xs'
									onClick={() => setIsEditOpen(true)}
									title='Edit map'
									className={styles.storyMapEmbedShellButton}
								>
									<Pencil className={styles.storyMapEmbedShellFoldHorizontal} />
								</Button>
							)}
						</div>
					</div>
				)}
				{children}
				{canEdit && edit && map.rawTag && (
					<MapConfigEditDialog
						open={isEditOpen}
						onOpenChange={setIsEditOpen}
						config={config}
						isSaving={edit.isSaving}
						onSave={(next) => edit.saveMap(map.rawTag!, next)}
						description={edit.saveDescription}
					/>
				)}
			</div>
		</div>
	);
}
