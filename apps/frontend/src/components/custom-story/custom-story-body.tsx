import { AlertTriangle } from 'lucide-react';
import { DEFAULT_STORY_THEME_PAIR } from '@quarry/shared/story-theme';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ApiOutputs } from '@/lib/api-types';
import type { StoryBlockEditPayload, StoryTableFormatEditRequest } from '@quarry/shared/story-app';
import type { StoryTheme, StoryThemePair } from '@quarry/shared/story-theme';
import type { StoryBlockReference } from '@quarry/shared/types';

import type { CustomStoryRuntimeError } from '@/components/custom-story/custom-story-frame';
import type { CustomStoryDataSource } from '@/components/custom-story/story-data-options';
import { CustomStoryFrame } from '@/components/custom-story/custom-story-frame';
import QuarryLogoAnimated from '@/components/icons/quarry-logo-animated';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsDarkMode } from '@/contexts/theme.provider';
import localStyles from './custom-story-body.module.css';

export type CustomStoryContent = ApiOutputs['story']['getCustomVersion'];
export type CustomStoryFileSummary = CustomStoryContent['files'][number];

interface CustomStoryBodyProps {
	dataSource: CustomStoryDataSource;
	content: CustomStoryContent | undefined;
	isLoading: boolean;
	error: { message: string } | null;
	hasPublishedVersion: boolean;
	editable?: boolean;
	onEditBlock?: (payload: StoryBlockEditPayload) => void;
	onEditTableFormat?: (request: StoryTableFormatEditRequest) => void;
	onAskBlock?: (block: StoryBlockReference) => void;
	onRememberState?: () => void;
	/** Room left under the story for an overlay such as the ask bar, filled with the story's own background. */
	bottomInset?: string;
}

const MAX_RUNTIME_ERRORS = 5;
const RUNTIME_ERROR_FLUSH_MS = 500;
const BUILDING_MESSAGE_INTERVAL_MS = 2500;
const BUILDING_MESSAGES = [
	'Story is building...',
	'Assembling your story...',
	'Crunching the numbers...',
	'Drawing the charts...',
	'Polishing the insights...',
	'Laying out the pages...',
	'Connecting the dots...',
	'Shaping the narrative...',
	'Almost there...',
	'Bringing your data to life...',
];

export function CustomStoryBody({
	dataSource,
	content,
	isLoading,
	error,
	hasPublishedVersion,
	editable = false,
	onEditBlock,
	onEditTableFormat,
	onAskBlock,
	onRememberState,
	bottomInset,
}: CustomStoryBodyProps) {
	const { runtimeErrors, runtimeErrorCount, handleRuntimeError } = useRuntimeErrors(content?.version.id);
	const styles = useMemo(
		() => [
			...(content?.styles.map((style) => style.content) ?? []),
			...(bottomInset ? [`body{padding-bottom:${bottomInset}}`] : []),
		],
		[content?.styles, bottomInset],
	);
	const theme = useActiveStoryTheme(content?.theme);

	return (
		<>
			{runtimeErrors.length > 0 && <RuntimeErrorBanner errors={runtimeErrors} count={runtimeErrorCount} />}
			<div className={localStyles.customStoryBodyDiv}>
				{isLoading || !hasPublishedVersion ? (
					<StoryBuilding />
				) : error ? (
					<Centered>{error.message}</Centered>
				) : content?.app ? (
					<CustomStoryFrame
						key={`${content.version.id}:${String(content.cachedAt)}`}
						dataSource={dataSource}
						app={content.app}
						styles={styles}
						theme={theme}
						editable={editable}
						onEditBlock={onEditBlock}
						onEditTableFormat={onEditTableFormat}
						onAskBlock={onAskBlock}
						onRememberState={onRememberState}
						onError={handleRuntimeError}
						stateControls={{
							usesState: content.usesState,
							hasLocalState: content.hasLocalState,
						}}
					/>
				) : (
					<BuildFailure message={content?.bundleError ?? 'This version has no build output.'} />
				)}
			</div>
		</>
	);
}

export function useActiveStoryTheme(pair: StoryThemePair | null | undefined): StoryTheme {
	const isDarkMode = useIsDarkMode();
	return (pair ?? DEFAULT_STORY_THEME_PAIR)[isDarkMode ? 'dark' : 'light'];
}

export function ActionErrorBanner({ message }: { message: string }) {
	return (
		<div className={localStyles.actionErrorBannerDiv} role='alert'>
			{message}
		</div>
	);
}

/** A story stuck in a throwing render loop reports errors non-stop: they are batched so the host re-renders at most twice a second. */
function useRuntimeErrors(versionId: string | undefined) {
	const [runtimeErrors, setRuntimeErrors] = useState<CustomStoryRuntimeError[]>([]);
	const [runtimeErrorCount, setRuntimeErrorCount] = useState(0);
	const queuedRef = useRef<CustomStoryRuntimeError[]>([]);
	const flushTimerRef = useRef<number | null>(null);

	useEffect(() => {
		queuedRef.current = [];
		setRuntimeErrors([]);
		setRuntimeErrorCount(0);
	}, [versionId]);

	useEffect(
		() => () => {
			if (flushTimerRef.current !== null) {
				window.clearTimeout(flushTimerRef.current);
			}
		},
		[],
	);

	const handleRuntimeError = useCallback((error: CustomStoryRuntimeError) => {
		queuedRef.current.push(error);
		if (flushTimerRef.current !== null) {
			return;
		}
		flushTimerRef.current = window.setTimeout(() => {
			const queued = queuedRef.current;
			queuedRef.current = [];
			flushTimerRef.current = null;
			setRuntimeErrors((current) => [...current, ...queued].slice(-MAX_RUNTIME_ERRORS));
			setRuntimeErrorCount((current) => current + queued.length);
		}, RUNTIME_ERROR_FLUSH_MS);
	}, []);

	return { runtimeErrors, runtimeErrorCount, handleRuntimeError };
}

function RuntimeErrorBanner({ errors, count }: { errors: CustomStoryRuntimeError[]; count: number }) {
	const latest = errors[errors.length - 1];
	return (
		<div className={localStyles.runtimeErrorBannerDiv}>
			<AlertTriangle className={localStyles.runtimeErrorBannerAlertTriangle} />
			<Tooltip>
				<TooltipTrigger asChild>
					<span className={localStyles.runtimeErrorBannerSpan}>
						{count > 1 && <span className={localStyles.runtimeErrorBannerSpan2}>{count} errors ·</span>}
						{latest.message}
					</span>
				</TooltipTrigger>
				<TooltipContent className={localStyles.runtimeErrorBannerTooltipContent}>
					{latest.stack ?? latest.message}
				</TooltipContent>
			</Tooltip>
		</div>
	);
}

function BuildFailure({ message }: { message: string }) {
	return (
		<div className={localStyles.buildFailureDiv}>
			<div className={localStyles.buildFailureDiv2}>
				<AlertTriangle className={localStyles.buildFailureAlertTriangle} />
				This version did not build
			</div>
			<pre className={localStyles.buildFailurePre}>
				{message}
			</pre>
		</div>
	);
}

function StoryBuilding() {
	const message = useCyclingMessage(BUILDING_MESSAGES, BUILDING_MESSAGE_INTERVAL_MS);
	return (
		<Centered>
			<div className={localStyles.storyBuildingDiv}>
				<QuarryLogoAnimated height={16} width={16} durationSeconds={2.2} title='' />
				<span className={localStyles.storyBuildingSpan}>{message}</span>
			</div>
		</Centered>
	);
}

function useCyclingMessage(messages: string[], intervalMs: number) {
	const [index, setIndex] = useState(0);

	useEffect(() => {
		const timer = window.setInterval(() => {
			setIndex((current) => (current + 1) % messages.length);
		}, intervalMs);
		return () => {
			window.clearInterval(timer);
		};
	}, [messages, intervalMs]);

	return messages[index];
}

function Centered({ children }: { children: React.ReactNode }) {
	return <div className={localStyles.centeredDiv}>{children}</div>;
}
