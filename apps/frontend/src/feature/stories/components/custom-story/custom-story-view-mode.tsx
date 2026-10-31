import { Code, Eye } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';

import type { IconSegmentedToggleOption } from '@/components/ui/icon-segmented-toggle';
import { IconSegmentedToggle } from '@/components/ui/icon-segmented-toggle';
import { cn } from '@/lib/utils';
import styles from './custom-story-view-mode.module.css';

export type CustomStoryViewMode = 'app' | 'files';

export interface CustomStoryViewModeControls {
	viewMode: CustomStoryViewMode;
	onViewModeChange: (mode: CustomStoryViewMode) => void;
}

const VIEW_MODES: readonly IconSegmentedToggleOption<CustomStoryViewMode>[] = [
	{ value: 'app', label: 'App', icon: Eye },
	{ value: 'files', label: 'Files', icon: Code },
];

export function isCustomStoryViewMode(mode: string): mode is CustomStoryViewMode {
	return VIEW_MODES.some((entry) => entry.value === mode);
}

export function CustomStoryViewModeToggle({ viewMode, onViewModeChange }: CustomStoryViewModeControls) {
	return <IconSegmentedToggle options={VIEW_MODES} value={viewMode} onValueChange={onViewModeChange} />;
}

interface CustomStoryViewLayersProps {
	viewMode: CustomStoryViewMode;
	app: ReactNode;
	files: ReactNode;
}

export function CustomStoryViewLayers({ viewMode, app, files }: CustomStoryViewLayersProps) {
	const [hasOpenedFiles, setHasOpenedFiles] = useState(viewMode === 'files');
	if (viewMode === 'files' && !hasOpenedFiles) {
		setHasOpenedFiles(true);
	}
	return (
		<div className={styles.customStoryViewLayersDiv}>
			<div
				className={cn(styles.customStoryViewLayersDiv2, viewMode === 'files' && styles.customStoryViewLayersDiv3)}
				aria-hidden={viewMode === 'files'}
			>
				{app}
			</div>
			{hasOpenedFiles && (
				<div
					className={cn(styles.customStoryViewLayersDiv4, viewMode !== 'files' && styles.customStoryViewLayersDiv3)}
					aria-hidden={viewMode !== 'files'}
				>
					{files}
				</div>
			)}
		</div>
	);
}
