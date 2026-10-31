import { ChartColumn, ChartLine, ChartPie, Pencil } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { SHEET_TRANSFORM, SHEET_VISUAL, StoryThumbnail } from './story-thumbnail';
import { StoryThemeProvider } from './story-theme-provider';
import styles from './custom-story-thumbnail.module.css';
import type { CSSProperties, ReactNode } from 'react';
import type { StorySummary } from '@quarry/shared/types';
import type { StoryTheme } from '@quarry/shared/story-theme';
import type { QueryDataMap } from './story-embeds';
import { useIsDarkMode } from '@/contexts/theme.provider';
import { cn } from '@/lib/utils';
import { storyApi } from '@/lib/story-api';

const ANIMATED = 'app-preview-animated';

const BAR_HEIGHTS = [0.61, 0.65, 0.3, 0.53, 0.3, 0.26, 0.53, 0.53, 0.65, 0.23, 0.61, 0.68, 0.81, 0.9, 0.81, 0.9];
const HOVERED_BAR_INDEX = 10;
const TEXT_LINE_WIDTHS = ['96%', '88%', '92%', '58%'];

const LINE_CHART_PATH =
	'M2.5 13L9.5 12L16.5 24L23.5 16L30.5 24L37.5 25L44.5 16L51.5 16L58.5 12L65.5 26L72.5 13L79.5 11L86.5 6L93.5 3L100.5 6L107.5 3';
const SPARKLINE_PATH = 'M2 20L9 15L16 17L23 9L30 12L37 5L44 7';
const POINTER_PATH = 'M4 3l6.5 17 2.4-7.1L20 10.5z';

const BLOCKS_SHIFT_ON_SCREEN = 'translate(-8.2px, 1.7px)';
const FLAT_THUMBNAIL_FRAME = styles.fLATTHUMBNAILFRAME;

const CLICKS = [
	{ x: 112.9, y: 24.2, atSeconds: 0.6 },
	{ x: 136.9, y: 20.1, atSeconds: 3.3 },
	{ x: 182.2, y: 22.6, atSeconds: 6.2 },
	{ x: 68.4, y: 39.8, atSeconds: 7.3 },
	{ x: 94.5, y: 71, atSeconds: 8.4 },
	{ x: 159.3, y: 16.3, atSeconds: 9.3 },
];

const SCREENSHOT_RETRY_DELAYS_MS = [3_000, 8_000, 20_000, 45_000];
const MAX_SCREENSHOT_ATTEMPTS = 12;

export function CustomStoryThumbnail({
	storyId,
	version,
	isToolPart = false,
	summary,
	queryData,
	theme: fallbackTheme,
}: {
	storyId?: string;
	version?: number;
	isToolPart?: boolean;
	summary?: StorySummary;
	queryData?: QueryDataMap | null;
	theme?: StoryTheme | null;
}) {
	const mode = useIsDarkMode() ? 'dark' : 'light';
	const { data: activeTheme } = useQuery({
		...storyApi.storyTheme.getActive.queryOptions(),
		enabled: storyId !== undefined,
	});
	const theme = activeTheme?.theme?.[mode] ?? fallbackTheme ?? null;
	const fallback = (
		<ThumbnailFallback summary={summary} queryData={queryData} isToolPart={isToolPart} theme={theme} />
	);
	if (storyId === undefined || activeTheme === undefined) {
		return fallback;
	}
	const src = thumbnailUrl(storyId, version, activeTheme.thumbnailFingerprint, mode);
	return <StoryScreenshot key={src} src={src} isToolPart={isToolPart} theme={theme} fallback={fallback} />;
}

function StoryScreenshot({
	src,
	isToolPart,
	theme,
	fallback,
}: {
	src: string;
	isToolPart: boolean;
	theme: StoryTheme | null;
	fallback: ReactNode;
}) {
	const [status, setStatus] = useState<'loading' | 'loaded' | 'missing'>('loading');
	const [attempt, setAttempt] = useState(0);

	useEffect(() => {
		if (status !== 'missing' || attempt >= MAX_SCREENSHOT_ATTEMPTS) {
			return;
		}
		const timeout = setTimeout(() => {
			setAttempt(attempt + 1);
			setStatus('loading');
		}, retryDelayAfter(attempt));
		return () => clearTimeout(timeout);
	}, [status, attempt]);

	return (
		<>
			{status !== 'loaded' && fallback}
			{status !== 'missing' && (
				<ScreenshotSheet
					key={attempt}
					src={src}
					isToolPart={isToolPart}
					isVisible={status === 'loaded'}
					theme={theme}
					onLoad={() => setStatus('loaded')}
					onError={() => setStatus('missing')}
				/>
			)}
		</>
	);
}

function ThumbnailFallback({
	summary,
	queryData,
	isToolPart,
	theme,
}: {
	summary?: StorySummary;
	queryData?: QueryDataMap | null;
	isToolPart: boolean;
	theme: StoryTheme | null;
}) {
	if (summary && summary.segments.length > 0) {
		return (
			<StoryThumbnail
				summary={summary}
				queryData={queryData}
				isToolPart={isToolPart}
				theme={theme}
				className={isToolPart ? styles.thumbnailFallbackStoryThumbnail : undefined}
			/>
		);
	}

	return <AppIllustration isToolPart={isToolPart} theme={theme} />;
}

/** The version and theme in the URL let the browser keep an image until either of them changes. */
function retryDelayAfter(attempt: number): number {
	return SCREENSHOT_RETRY_DELAYS_MS[Math.min(attempt, SCREENSHOT_RETRY_DELAYS_MS.length - 1)];
}

function thumbnailUrl(storyId: string, version: number | undefined, theme: string, mode: 'light' | 'dark'): string {
	const params = new URLSearchParams();
	if (version !== undefined) {
		params.set('version', String(version));
	}
	params.set('theme', theme);
	params.set('mode', mode);
	return `/api/stories/${encodeURIComponent(storyId)}/thumbnail?${params}`;
}

function ScreenshotSheet({
	src,
	isToolPart,
	isVisible,
	theme,
	onLoad,
	onError,
}: {
	src: string;
	isToolPart: boolean;
	isVisible: boolean;
	theme: StoryTheme | null;
	onLoad: () => void;
	onError: () => void;
}) {
	if (isToolPart) {
		return (
			<div
				className={cn(
					styles.screenshotSheetDiv,
					isVisible ? styles.screenshotSheetDiv2 : styles.screenshotSheetDiv3,
				)}
			>
				<StoryThemeProvider theme={theme} className={styles.screenshotSheetStoryThemeProvider}>
					<div className={styles.screenshotSheetDiv4}>
						<div
							className={cn(styles.screenshotSheetDiv5, SHEET_VISUAL)}
							style={{ transform: SHEET_TRANSFORM }}
						/>
						<img
							src={src}
							alt=''
							loading='lazy'
							decoding='async'
							fetchPriority='low'
							onLoad={onLoad}
							onError={onError}
							className={cn(styles.screenshotSheetImg, SHEET_VISUAL, styles.screenshotSheetImg2)}
							style={{ transform: SHEET_TRANSFORM }}
						/>
					</div>
				</StoryThemeProvider>
			</div>
		);
	}

	return (
		<div
			className={cn(
				styles.screenshotSheetDiv,
				isVisible ? styles.screenshotSheetDiv2 : styles.screenshotSheetDiv3,
				styles.screenshotSheetDiv6,
			)}
		>
			<StoryThemeProvider
				theme={theme}
				className={cn(styles.screenshotSheetStoryThemeProvider, FLAT_THUMBNAIL_FRAME)}
			>
				<div className={styles.screenshotSheetDiv7}>
					<img
						src={src}
						alt=''
						loading='lazy'
						decoding='async'
						fetchPriority='low'
						onLoad={onLoad}
						onError={onError}
						className={styles.screenshotSheetImg3}
					/>
				</div>
			</StoryThemeProvider>
		</div>
	);
}

function AppIllustration({ isToolPart, theme }: { isToolPart: boolean; theme: StoryTheme | null }) {
	if (isToolPart) {
		return (
			<div className={`${styles.appIllustrationDiv} custom-story-thumbnail`}>
				<StoryThemeProvider theme={theme} className={styles.appIllustrationStoryThemeProvider}>
					<div className={styles.screenshotSheetDiv4}>
						<AppSheet isToolPart={isToolPart} />
						<div className={styles.appIllustrationDiv2} style={{ transform: BLOCKS_SHIFT_ON_SCREEN }}>
							<BarTooltip />
							{CLICKS.map((click) => (
								<ClickRipple key={click.atSeconds} {...click} />
							))}
							<Pointer />
						</div>
					</div>
				</StoryThemeProvider>
			</div>
		);
	}

	return (
		<div className={`${styles.appIllustrationDiv3} custom-story-thumbnail`}>
			<StoryThemeProvider
				theme={theme}
				className={cn(styles.screenshotSheetStoryThemeProvider, FLAT_THUMBNAIL_FRAME)}
			>
				<AppSheet isToolPart={isToolPart} />
				<div className={styles.appIllustrationDiv2}>
					<BarTooltip />
					{CLICKS.map((click) => (
						<ClickRipple key={click.atSeconds} {...click} />
					))}
					<Pointer />
				</div>
			</StoryThemeProvider>
		</div>
	);
}

function AppSheet({ isToolPart }: { isToolPart: boolean }) {
	const sheetSize = isToolPart ? styles.sheetSize : styles.sheetSize2;

	if (isToolPart) {
		return (
			<>
				<div
					className={cn(styles.appSheetDiv, sheetSize, SHEET_VISUAL)}
					style={{ transform: SHEET_TRANSFORM }}
				/>
				<div
					className={cn(
						styles.appSheetDiv2,
						sheetSize,
						styles.appSheetDiv3,
						SHEET_VISUAL,
						styles.appSheetDiv4,
					)}
					style={{ transform: SHEET_TRANSFORM }}
				>
					<BlockEditPanel isToolPart={isToolPart} />
					<StoryTitle isToolPart={isToolPart} />
					<StoryTabs isToolPart={isToolPart} />
					<TextBlock isToolPart={isToolPart} />
					<ChartBlock isToolPart={isToolPart} />
					<InsightsBlock isToolPart={isToolPart} />
				</div>
			</>
		);
	}

	return (
		<div className={styles.screenshotSheetDiv7}>
			<div className={styles.appSheetDiv5}>
				<BlockEditPanel isToolPart={isToolPart} />
				<StoryTitle isToolPart={isToolPart} />
				<StoryTabs isToolPart={isToolPart} />
				<TextBlock isToolPart={isToolPart} />
				<ChartBlock isToolPart={isToolPart} />
				<InsightsBlock isToolPart={isToolPart} />
			</div>
		</div>
	);
}

function BlockEditPanel({ isToolPart }: { isToolPart: boolean }) {
	const adjustedTop = isToolPart ? 4 : 0;
	return (
		<div
			className={cn(styles.blockEditPanelDiv, isToolPart ? styles.blockEditPanelDiv2 : styles.blockEditPanelDiv3)}
		>
			<div
				className={cn(styles.blockEditPanelDiv4, isToolPart && styles.blockEditPanelDiv5, ANIMATED)}
				style={animation('app-preview-edit-panel')}
			>
				<div className={styles.blockEditPanelDiv6} />
				<div className={cn(styles.blockEditPanelDiv7, ANIMATED)} style={animation('app-preview-editing')} />
				<div className={styles.blockEditPanelDiv8} />
				<ChartTypeTile left={6} top={adjustedTop} icon={ChartColumn} selectedAnimation='app-preview-tile-bar' />
				<ChartTypeTile left={23} top={adjustedTop} icon={ChartLine} selectedAnimation='app-preview-tile-line' />
				<ChartTypeTile left={40} top={adjustedTop} icon={ChartPie} />
				<div
					className={cn(
						styles.blockEditPanelDiv9,
						isToolPart ? styles.blockEditPanelDiv10 : styles.blockEditPanelDiv11,
					)}
				>
					<div className={styles.blockEditPanelDiv12} />
				</div>
				<ColorSwatches isToolPart={isToolPart} />
				<div
					className={cn(
						styles.blockEditPanelDiv13,
						isToolPart ? styles.blockEditPanelDiv14 : styles.blockEditPanelDiv15,
					)}
				>
					<div className={styles.blockEditPanelDiv16} />
				</div>
				<div
					className={cn(
						styles.blockEditPanelDiv17,
						isToolPart ? styles.blockEditPanelDiv14 : styles.blockEditPanelDiv15,
					)}
				>
					<div className={styles.blockEditPanelDiv18} />
				</div>
			</div>
		</div>
	);
}

function ChartTypeTile({
	left,
	top,
	icon: Icon,
	selectedAnimation,
}: {
	left: number;
	top: number;
	icon: typeof ChartColumn;
	selectedAnimation?: string;
}) {
	return (
		<div className={styles.chartTypeTileDiv} style={{ left, top: top + 18 }}>
			<Icon className={styles.chartTypeTileIcon} strokeWidth={3} />
			{selectedAnimation && (
				<div className={cn(styles.chartTypeTileDiv2, ANIMATED)} style={animation(selectedAnimation)}>
					<Icon className={styles.chartTypeTileIcon2} strokeWidth={3} />
				</div>
			)}
		</div>
	);
}

function ColorSwatches({ isToolPart }: { isToolPart: boolean }) {
	return (
		<div className={cn(styles.colorSwatchesDiv, isToolPart ? styles.colorSwatchesDiv2 : styles.colorSwatchesDiv3)}>
			<div className={styles.colorSwatchesDiv4} />
			<div className={styles.colorSwatchesDiv5} />
			<div className={styles.colorSwatchesDiv6} />
			<div className={styles.colorSwatchesDiv7} />
		</div>
	);
}

function StoryTitle({ isToolPart }: { isToolPart: boolean }) {
	return <div className={cn(styles.storyTitleDiv, isToolPart ? styles.storyTitleDiv2 : styles.storyTitleDiv3)} />;
}

function StoryTabs({ isToolPart }: { isToolPart: boolean }) {
	const firstTabLeft = isToolPart ? 30 : 42;

	return (
		<>
			{[1, 2, 3].map((tab) => (
				<div key={tab} className={styles.storyTabsDiv} style={{ left: firstTabLeft + 34 * tab }}>
					<div className={styles.storyTabsDiv2} />
					<div className={cn(styles.storyTabsDiv3, ANIMATED)} style={animation(`app-preview-tab-${tab}`)}>
						<div className={styles.storyTabsDiv4} />
					</div>
				</div>
			))}
		</>
	);
}

function TextBlock({ isToolPart }: { isToolPart: boolean }) {
	return (
		<StoryBlock tab={1} isToolPart={isToolPart} className={styles.textBlockStoryBlock}>
			<div className={styles.textBlockDiv}>
				<TypedLine className={styles.textBlockTypedLine} delaySeconds={0} />
				{TEXT_LINE_WIDTHS.map((width, index) => (
					<TypedLine
						key={width}
						className={styles.textBlockTypedLine2}
						style={{ width }}
						delaySeconds={0.12 * (index + 1)}
					/>
				))}
			</div>
			<BlockPencil className={styles.textBlockBlockPencil} />
		</StoryBlock>
	);
}

function TypedLine({
	className,
	style,
	delaySeconds,
}: {
	className: string;
	style?: CSSProperties;
	delaySeconds: number;
}) {
	return (
		<div
			className={cn(styles.typedLineDiv, className, ANIMATED)}
			style={{ ...style, ...animation('app-preview-type', delaySeconds) }}
		/>
	);
}

function ChartBlock({ isToolPart }: { isToolPart: boolean }) {
	return (
		<StoryBlock tab={2} isToolPart={isToolPart} className={styles.chartBlockStoryBlock}>
			<div className={cn(styles.chartBlockDiv, ANIMATED)} style={animation('app-preview-chart-bars')}>
				{BAR_HEIGHTS.map((height, index) => (
					<ChartBar
						key={index}
						height={height}
						delaySeconds={index * 0.03}
						isHovered={index === HOVERED_BAR_INDEX}
					/>
				))}
			</div>
			<svg
				viewBox='0 0 112 34'
				className={cn(styles.chartBlockSvg, ANIMATED)}
				style={animation('app-preview-chart-line')}
			>
				<path d={`${LINE_CHART_PATH}L107.5 34L2.5 34Z`} className={styles.chartBlockPath} />
				<path
					d={LINE_CHART_PATH}
					pathLength={100}
					strokeDasharray={100}
					className={cn(styles.chartBlockPath2, ANIMATED)}
					strokeWidth={1.6}
					strokeLinejoin='round'
					strokeLinecap='round'
					style={animation('app-preview-line-draw')}
				/>
			</svg>
			<div className={cn(styles.chartBlockDiv2, ANIMATED)} style={animation('app-preview-editing')} />
			<BlockPencil className={styles.chartBlockBlockPencil} />
		</StoryBlock>
	);
}

function ChartBar({ height, delaySeconds, isHovered }: { height: number; delaySeconds: number; isHovered: boolean }) {
	return (
		<div
			className={cn(styles.chartBarDiv, ANIMATED)}
			style={{ height: `${height * 100}%`, ...animation('app-preview-grow', delaySeconds) }}
		>
			{isHovered && <div className={cn(styles.chartBarDiv2, ANIMATED)} style={animation('app-preview-hover')} />}
		</div>
	);
}

function InsightsBlock({ isToolPart }: { isToolPart: boolean }) {
	return (
		<StoryBlock tab={3} isToolPart={isToolPart} className={styles.insightsBlockStoryBlock}>
			<div
				className={cn(
					styles.insightsBlockDiv,
					isToolPart ? styles.insightsBlockDiv2 : styles.insightsBlockDiv3,
					ANIMATED,
				)}
				style={animation('app-preview-insight-pop')}
			>
				<div className={styles.insightsBlockDiv4}>
					<div className={cn(styles.insightsBlockDiv5, ANIMATED)} style={animation('app-preview-kpi-fill')} />
					<div className={styles.insightsBlockDiv6} />
				</div>
				<BlockPencil
					className={cn(
						styles.insightsBlockBlockPencil,
						isToolPart ? styles.insightsBlockBlockPencil2 : styles.insightsBlockBlockPencil3,
					)}
				/>
			</div>
			<div
				className={cn(
					styles.insightsBlockDiv7,
					isToolPart ? styles.insightsBlockDiv8 : styles.insightsBlockDiv9,
				)}
			>
				<svg viewBox='0 0 36 36' className={styles.insightsBlockSvg}>
					<circle cx='18' cy='18' r='12' className={styles.insightsBlockCircle} strokeWidth={6} />
					<circle
						cx='18'
						cy='18'
						r='12'
						transform='rotate(-90 18 18)'
						strokeDasharray={75.4}
						strokeWidth={6}
						className={cn(styles.insightsBlockCircle2, ANIMATED)}
						style={animation('app-preview-pie-fill')}
					/>
				</svg>
				<BlockPencil className={styles.insightsBlockBlockPencil4} />
			</div>
			<div
				className={cn(
					styles.insightsBlockDiv10,
					isToolPart ? styles.insightsBlockDiv11 : styles.insightsBlockDiv12,
				)}
			>
				<svg viewBox='0 0 46 24' className={styles.insightsBlockSvg2}>
					<path d='M2 22H44' className={styles.insightsBlockCircle} strokeWidth={1} />
					<path
						d={SPARKLINE_PATH}
						pathLength={100}
						strokeDasharray={100}
						strokeWidth={1.8}
						strokeLinecap='round'
						strokeLinejoin='round'
						className={cn(styles.chartBlockPath2, ANIMATED)}
						style={animation('app-preview-spark-draw')}
					/>
				</svg>
				<BlockPencil
					className={cn(
						styles.insightsBlockBlockPencil5,
						isToolPart ? styles.insightsBlockDiv8 : styles.insightsBlockBlockPencil6,
					)}
				/>
			</div>
		</StoryBlock>
	);
}

function StoryBlock({
	tab,
	isToolPart,
	className,
	children,
}: {
	tab: number;
	isToolPart: boolean;
	className: string;
	children: ReactNode;
}) {
	return (
		<div
			className={cn(
				styles.storyBlockDiv,
				isToolPart ? styles.storyTitleDiv2 : styles.storyTitleDiv3,
				className,
				ANIMATED,
			)}
			style={animation(`app-preview-tab-${tab}`)}
		>
			{children}
		</div>
	);
}

function BlockPencil({ className }: { className: string }) {
	return (
		<div className={cn(styles.blockPencilDiv, className)}>
			<Pencil className={styles.blockPencilPencil} strokeWidth={3} />
		</div>
	);
}

function BarTooltip() {
	return (
		<div className={cn(styles.barTooltipDiv, ANIMATED)} style={animation('app-preview-hover')}>
			<div className={styles.barTooltipDiv2}>
				<div className={styles.barTooltipDiv3} />
				<div className={styles.barTooltipDiv4} />
			</div>
			<div className={styles.barTooltipDiv5} />
		</div>
	);
}

function ClickRipple({ x, y, atSeconds }: { x: number; y: number; atSeconds: number }) {
	return (
		<div
			className={cn(styles.clickRippleDiv, ANIMATED)}
			style={{ left: x - 9, top: y - 9, ...animation('app-preview-ripple', atSeconds) }}
		/>
	);
}

function Pointer() {
	return (
		<svg
			viewBox='0 0 24 24'
			className={cn(styles.pointerSvg, ANIMATED)}
			strokeWidth={1.6}
			strokeLinejoin='round'
			style={{ ...animation('app-preview-pointer'), animationTimingFunction: 'ease-in-out' }}
		>
			<path d={POINTER_PATH} />
		</svg>
	);
}

function animation(name: string, delaySeconds = 0): CSSProperties {
	return { animationName: name, '--app-preview-delay': `${delaySeconds}s` } as CSSProperties;
}
