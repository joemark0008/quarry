import { buildChart, formatChartValue } from '@quarry/shared';
import { getGridTemplateColumns } from '@quarry/shared/story-segments';
import type { ReactNode } from 'react';
import type { StorySummary, SummarySegment } from '@quarry/shared/types';
import type { ChartType } from '@quarry/shared/chart-types';
import type { StoryTheme } from '@quarry/shared/story-theme';
import type { QueryDataMap } from './story-embeds';
import { ChartContainer } from '@/components/ui/chart';
import { StoryThemeProvider } from './story-theme-provider';
import { cn } from '@/lib/utils';
import styles from './story-thumbnail.module.css';

export const SHEET_VISUAL = styles.sHEETVISUAL;

export const SHEET_TRANSFORM = 'perspective(400px) rotateX(30deg) rotateY(20deg) rotateZ(-20deg)';

export const SHEET_SURFACE = styles.sHEETSURFACE;

export function PaperSheet({
	children,
	className,
	isToolPart = false,
	theme,
}: {
	children: ReactNode;
	className?: string;
	isToolPart?: boolean;
	theme?: StoryTheme | null;
}) {
	return (
		<div className={cn(styles.paperSheetDiv, className)}>
			<StoryThemeProvider theme={theme ?? null} className={styles.paperSheetStoryThemeProvider}>
				<div
					className={cn(
						styles.paperSheetDiv2,
						isToolPart ? styles.paperSheetDiv3 : styles.paperSheetDiv4,
						SHEET_VISUAL,
					)}
					style={{ transform: SHEET_TRANSFORM }}
				/>
				<div
					className={cn(
						styles.paperSheetDiv5,
						isToolPart ? styles.paperSheetDiv6 : styles.paperSheetDiv7,
						SHEET_SURFACE,
						styles.paperSheetDiv8,
						isToolPart ? styles.paperSheetDiv9 : styles.paperSheetDiv10,
					)}
					style={{ transform: SHEET_TRANSFORM }}
				>
					<div className={styles.paperSheetDiv11}>{children}</div>
				</div>
			</StoryThemeProvider>
		</div>
	);
}

export function StoryThumbnail({
	summary,
	className,
	isToolPart = false,
	theme,
	queryData,
}: {
	summary: StorySummary;
	className?: string;
	isToolPart?: boolean;
	theme?: StoryTheme | null;
	queryData?: QueryDataMap | null;
}) {
	const segments = summary.segments.slice(0, 6);

	if (!isToolPart) {
		return (
			<FlatStorySheet className={className} theme={theme}>
				{segments.map((seg, i) => (
					<SegmentSilhouette key={i} segment={seg} variant='flat' queryData={queryData} />
				))}
			</FlatStorySheet>
		);
	}

	return (
		<PaperSheet className={className} isToolPart={isToolPart} theme={theme}>
			{segments.map((seg, i) => (
				<SegmentSilhouette key={i} segment={seg} variant='mini' queryData={queryData} />
			))}
		</PaperSheet>
	);
}

function FlatStorySheet({
	children,
	className,
	theme,
}: {
	children: ReactNode;
	className?: string;
	theme?: StoryTheme | null;
}) {
	return (
		<div className={cn(styles.flatStorySheetDiv, className)}>
			<StoryThemeProvider
				theme={theme ?? null}
				className={styles.flatStorySheetStoryThemeProvider}
			>
				<div className={styles.flatStorySheetDiv2}>
					{children}
				</div>
			</StoryThemeProvider>
		</div>
	);
}

export function FolderThumbnail({ theme }: { theme?: StoryTheme | null } = {}) {
	return (
		<div className={styles.folderThumbnailDiv}>
			<StoryThemeProvider theme={theme ?? null} className={styles.folderThumbnailStoryThemeProvider}>
				<div
					className={cn(
						styles.folderThumbnailDiv2,
						SHEET_VISUAL,
					)}
					style={{ transform: SHEET_TRANSFORM }}
				>
					<div className={styles.folderThumbnailDiv3} />
				</div>

				<div
					className={cn(
						styles.folderThumbnailDiv4,
						SHEET_VISUAL,
					)}
					style={{ transform: SHEET_TRANSFORM }}
				/>

				<div
					className={cn(
						styles.folderThumbnailDiv5,
						SHEET_SURFACE,
						SHEET_VISUAL,
					)}
					style={{ transform: SHEET_TRANSFORM }}
				/>

				<div
					className={styles.folderThumbnailDiv6}
					style={{ transform: SHEET_TRANSFORM }}
				>
					<div
						className={styles.folderThumbnailDiv7}
						style={{
							maskImage: 'linear-gradient(to top right, transparent 20%, black 78%)',
							WebkitMaskImage: 'linear-gradient(to top right, transparent 20%, black 78%)',
						}}
					/>
				</div>

				<div
					className={styles.folderThumbnailDiv8}
					style={{ transform: `${SHEET_TRANSFORM} rotateY(-1.5deg)` }}
				>
					<div
						className={styles.folderThumbnailDiv9}
						style={{
							maskImage: 'linear-gradient(to left, transparent 8%, black 70%)',
							WebkitMaskImage: 'linear-gradient(to left, transparent 8%, black 70%)',
						}}
					/>
				</div>
			</StoryThemeProvider>
		</div>
	);
}

type ThumbnailVariant = 'flat' | 'mini';

function SegmentSilhouette({
	segment,
	variant,
	queryData,
}: {
	segment: SummarySegment;
	variant: ThumbnailVariant;
	queryData?: QueryDataMap | null;
}) {
	switch (segment.type) {
		case 'text':
			return <TextBlock content={segment.content} variant={variant} />;
		case 'chart':
			return (
				<MiniChart
					chartType={segment.chartType}
					title={segment.title}
					kpiCount={segment.kpiCount}
					colors={segment.colors}
					variant={variant}
					queryId={segment.queryId}
					series={segment.series}
					queryData={queryData}
				/>
			);
		case 'table':
			return <MiniTable title={segment.title} variant={variant} />;
		case 'map':
			return <MiniMap title={segment.title} color={segment.color} variant={variant} />;
		case 'grid':
			return (
				<GridSilhouette
					cols={segment.cols}
					widths={segment.widths}
					children={segment.children}
					variant={variant}
					queryData={queryData}
				/>
			);
	}
}

function TextBlock({ content, variant }: { content: string; variant: ThumbnailVariant }) {
	const lines = content
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	return (
		<div className={styles.textBlockDiv}>
			<div className={styles.textBlockDiv2}>{renderMarkdownPreview(lines, variant)}</div>
		</div>
	);
}

function renderMarkdownPreview(lines: string[], variant: ThumbnailVariant): ReactNode[] {
	const nodes: ReactNode[] = [];
	for (let i = 0; i < lines.length && nodes.length < 5; i++) {
		const line = lines[i];
		const nextLine = lines[i + 1];

		if (isMarkdownTableStart(line, nextLine)) {
			const tableLines = [line];
			i += 2;
			while (i < lines.length && isMarkdownTableRow(lines[i])) {
				tableLines.push(lines[i]);
				i++;
			}
			i--;
			nodes.push(<MarkdownTablePreview key={i} lines={tableLines} variant={variant} />);
			continue;
		}

		const node = renderMarkdownLine(line, variant, i);
		if (node) {
			nodes.push(node);
		}
	}
	return nodes;
}

function renderMarkdownLine(line: string, variant: ThumbnailVariant, key: number): ReactNode {
	const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
	if (headingMatch) {
		const level = headingMatch[1].length;
		return (
			<span
				key={key}
				className={cn(
					styles.renderMarkdownLineSpan,
					variant === 'flat' && level === 1 && styles.renderMarkdownLineSpan2,
					variant === 'flat' && level === 2 && styles.renderMarkdownLineSpan3,
					variant === 'flat' && level === 3 && styles.renderMarkdownLineSpan4,
					variant === 'mini' && level === 1 && styles.renderMarkdownLineSpan5,
					variant === 'mini' && level === 2 && styles.renderMarkdownLineSpan6,
					variant === 'mini' && level === 3 && styles.renderMarkdownLineSpan7,
				)}
			>
				{headingMatch[2]}
			</span>
		);
	}

	if (/^-{3,}$/.test(line)) {
		return (
			<div
				key={key}
				className={cn(variant === 'flat' ? styles.renderMarkdownLineDiv : styles.renderMarkdownLineDiv2)}
			/>
		);
	}

	const bulletMatch = line.match(/^[-*]\s+(.+)/);
	if (bulletMatch) {
		return (
			<span key={key} className={cn(styles.renderMarkdownLineSpan8, textSize(variant))}>
				<span
					className={cn(
						styles.renderMarkdownLineSpan9,
						variant === 'flat' ? styles.renderMarkdownLineSpan10 : styles.renderMarkdownLineSpan11,
					)}
				/>
				<span className={styles.renderMarkdownLineSpan12}>
					<InlineMarkdown text={bulletMatch[1]} />
				</span>
			</span>
		);
	}

	return (
		<span key={key} className={cn(styles.renderMarkdownLineSpan13, textSize(variant))}>
			<InlineMarkdown text={line} />
		</span>
	);
}

function textSize(variant: ThumbnailVariant): string {
	return variant === 'flat' ? styles.textSize : styles.textSize2;
}

function MarkdownTablePreview({ lines, variant }: { lines: string[]; variant: ThumbnailVariant }) {
	const rows = lines.map(splitTableCells).filter((row) => row.length > 0);
	const [header, ...body] = rows;
	const visibleBody = body.slice(0, variant === 'flat' ? 3 : 2);

	return (
		<div
			className={cn(
				styles.markdownTablePreviewDiv,
				variant === 'flat' ? styles.markdownTablePreviewDiv2 : styles.markdownTablePreviewDiv3,
			)}
		>
			<div className={styles.markdownTablePreviewDiv4}>
				{header.slice(0, 3).map((cell, i) => (
					<span
						key={i}
						className={cn(styles.markdownTablePreviewSpan, textSize(variant))}
					>
						<InlineMarkdown text={cell} />
					</span>
				))}
			</div>
			{visibleBody.map((row, i) => (
				<div key={i} className={cn(styles.markdownTablePreviewDiv5, i % 2 === 1 && styles.markdownTablePreviewDiv6)}>
					{row.slice(0, 3).map((cell, j) => (
						<span key={j} className={cn(styles.markdownTablePreviewSpan2, textSize(variant))}>
							<InlineMarkdown text={cell} />
						</span>
					))}
				</div>
			))}
		</div>
	);
}

function isMarkdownTableStart(line: string, nextLine: string | undefined): nextLine is string {
	return isMarkdownTableRow(line) && nextLine !== undefined && isMarkdownTableSeparator(nextLine);
}

function isMarkdownTableRow(line: string): boolean {
	return line.includes('|') && /^\|?.+\|.+\|?$/.test(line);
}

function isMarkdownTableSeparator(line: string): boolean {
	return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line);
}

function splitTableCells(line: string): string[] {
	return line
		.replace(/^\|/, '')
		.replace(/\|$/, '')
		.split('|')
		.map((cell) => cell.trim());
}

function InlineMarkdown({ text }: { text: string }) {
	const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
	return (
		<>
			{parts.map((part, i) =>
				part.startsWith('**') && part.endsWith('**') ? (
					<strong key={i} className={styles.inlineMarkdownStrong}>
						{part.slice(2, -2)}
					</strong>
				) : (
					part
				),
			)}
		</>
	);
}

const KPI_COLOR = styles.kPICOLOR;
const DEFAULT_CHART_COLORS = Array.from({ length: 11 }, (_, i) => `var(--chart-${i + 1})`);

type KpiPreviewValue = {
	label: string;
	value: string;
};

type KpiPreviewSeries = NonNullable<Extract<SummarySegment, { type: 'chart' }>['series']>;

function KpiSilhouette({
	count,
	colors,
	values,
	variant,
}: {
	count: number;
	colors: string[];
	values: KpiPreviewValue[] | null;
	variant: ThumbnailVariant;
}) {
	if (values && values.length > 0) {
		const visibleValues = values.slice(0, Math.min(Math.max(count, 1), 4));
		if (variant === 'flat') {
			return (
				<div className={styles.kpiSilhouetteDiv}>
					{visibleValues.map((item, i) => (
						<div key={`${item.label}-${i}`} className={styles.kpiSilhouetteDiv2}>
							<div className={styles.kpiSilhouetteDiv3}>
								<div className={styles.kpiSilhouetteDiv4}>
									{item.label}
								</div>
							</div>
							<div className={styles.kpiSilhouetteDiv5}>
								{item.value}
							</div>
						</div>
					))}
				</div>
			);
		}

		return (
			<div className={cn(styles.kpiSilhouetteDiv6, visibleValues.length > 1 ? styles.kpiSilhouetteDiv7 : styles.kpiSilhouetteDiv8, styles.kpiSilhouetteDiv9)}>
				{visibleValues.map((item, i) => (
					<div key={`${item.label}-${i}`} className={styles.kpiSilhouetteDiv10}>
						<div className={styles.kpiSilhouetteDiv11}>{item.label}</div>
						<div className={styles.kpiSilhouetteDiv12}>
							{item.value}
						</div>
					</div>
				))}
			</div>
		);
	}

	const cards = Math.min(Math.max(count, 1), 4);
	if (variant === 'flat') {
		return (
			<div className={styles.kpiSilhouetteDiv}>
				{Array.from({ length: cards }).map((_, i) => (
					<div key={i} className={styles.kpiSilhouetteDiv13}>
						<div
							className={cn(styles.kpiSilhouetteDiv14, colors.length === 0 && KPI_COLOR)}
							style={{ backgroundColor: colorAt(colors, i) }}
						/>
					</div>
				))}
			</div>
		);
	}

	return (
		<div className={styles.kpiSilhouetteDiv15}>
			{Array.from({ length: cards }).map((_, i) => (
				<div key={i} className={styles.kpiSilhouetteDiv16}>
					<div
						className={cn(styles.kpiSilhouetteDiv17, colors.length === 0 && KPI_COLOR)}
						style={{ backgroundColor: colorAt(colors, i) }}
					/>
				</div>
			))}
		</div>
	);
}

function MiniChart({
	chartType,
	title,
	kpiCount,
	colors = [],
	variant,
	queryId,
	series,
	queryData,
}: {
	chartType: string;
	title: string;
	kpiCount?: number;
	colors?: string[];
	variant: ThumbnailVariant;
	queryId?: string;
	series?: KpiPreviewSeries;
	queryData?: QueryDataMap | null;
}) {
	const kpiValues = chartType === 'kpi_card' ? getKpiPreviewValues({ queryData, queryId, series }) : null;

	return (
		<PreviewBlock title={chartType === 'kpi_card' ? '' : title} variant={variant}>
			{chartType === 'kpi_card' ? (
				<KpiSilhouette count={kpiCount ?? 1} colors={colors} values={kpiValues} variant={variant} />
			) : (
				<RechartsThumbnail chartType={chartType} colors={colors} variant={variant} />
			)}
		</PreviewBlock>
	);
}

function getKpiPreviewValues({
	queryData,
	queryId,
	series,
}: {
	queryData?: QueryDataMap | null;
	queryId?: string;
	series?: KpiPreviewSeries;
}): KpiPreviewValue[] | null {
	if (!queryData || !queryId || !series || series.length === 0) {
		return null;
	}
	const latestRow = queryData[queryId]?.data.at(-1);
	if (!latestRow) {
		return null;
	}
	const values = series.flatMap((item) => {
		const label = item.label ?? item.dataKey;
		const rawValue = latestRow[item.dataKey];
		if (typeof rawValue === 'number') {
			return [{ label, value: formatChartValue(rawValue, item.valueFormat, { compact: true }) }];
		}
		if (typeof rawValue === 'string' && rawValue.trim() !== '') {
			return [{ label, value: rawValue }];
		}
		return [];
	});
	return values.length > 0 ? values : null;
}

function PreviewBlock({ title, children, variant }: { title: string; children: ReactNode; variant: ThumbnailVariant }) {
	return (
		<div
			className={cn(styles.previewBlockDiv, variant === 'flat' ? styles.previewBlockDiv2 : styles.previewBlockDiv3)}
			style={{
				borderColor: 'var(--app-line)',
				borderRadius: thumbnailBlockRadius(variant),
				borderWidth: 'var(--story-block-border-width, 0px)',
			}}
		>
			{title && (
				<span
					className={cn(
						styles.previewBlockSpan,
						variant === 'flat' ? styles.previewBlockSpan2 : styles.previewBlockSpan3,
					)}
				>
					{title}
				</span>
			)}
			{children}
		</div>
	);
}

function thumbnailBlockRadius(variant: ThumbnailVariant): string {
	const scale = variant === 'flat' ? 0.5 : 0.25;
	return `calc(var(--story-block-radius, var(--app-radius)) * ${scale})`;
}

function colorAt(colors: string[], index: number): string {
	return colors[index % colors.length] ?? DEFAULT_CHART_COLORS[index % DEFAULT_CHART_COLORS.length];
}

function RechartsThumbnail({
	chartType,
	colors,
	variant,
}: {
	chartType: string;
	colors: string[];
	variant: ThumbnailVariant;
}) {
	const { data, series, xAxisKey } = thumbnailChartData(chartType, colors);
	const config = Object.fromEntries(
		series.map((item, i) => [item.data_key, { label: item.label, color: colorAt(colors, i) }]),
	);
	const chart = buildChart({
		data,
		chartType: chartType as ChartType,
		xAxisKey,
		xAxisType: 'category',
		series,
		colorFor: (_key, i) => colorAt(colors, i),
		showGrid: false,
		renderTitle: false,
		hideAxes: true,
		showDataLabels: false,
		animate: false,
		margin: { top: 0, right: 0, bottom: 0, left: 0 },
		backgroundColor: 'var(--app-surface)',
	});

	return (
		<ChartContainer
			config={config}
			className={styles.rechartsThumbnailChartContainer}
			contentClassName={cn(styles.rechartsThumbnailChartContainer2, variant === 'flat' ? styles.rechartsThumbnailChartContainer3 : styles.rechartsThumbnailChartContainer4)}
		>
			{chart}
		</ChartContainer>
	);
}

function thumbnailChartData(chartType: string, colors: string[]) {
	if (chartType === 'pie' || chartType === 'donut') {
		return {
			xAxisKey: 'x',
			series: [{ data_key: 's0', label: 'Value', color: colorAt(colors, 0) }],
			data: [
				{ x: 'A', s0: 42 },
				{ x: 'B', s0: 28 },
				{ x: 'C', s0: 18 },
				{ x: 'D', s0: 12 },
			],
		};
	}

	const seriesCount = chartType === 'mixed' || chartType.includes('stacked') ? Math.max(colors.length, 2) : 1;
	const series = Array.from({ length: Math.min(seriesCount, 3) }, (_, i) => ({
		data_key: `s${i}`,
		label: `Series ${i + 1}`,
		color: colorAt(colors, i),
		...(chartType === 'mixed' && i % 2 === 1 ? { series_type: 'line' as const } : {}),
	}));
	const values = [
		[18, 32, 24, 46, 38, 55],
		[12, 18, 28, 24, 34, 30],
		[8, 14, 11, 19, 16, 22],
	];

	return {
		xAxisKey: 'x',
		series,
		data: values[0].map((_, rowIndex) => ({
			x: `P${rowIndex + 1}`,
			...Object.fromEntries(
				series.map((item, seriesIndex) => [item.data_key, values[seriesIndex % values.length][rowIndex]]),
			),
		})),
	};
}

function MiniTable({ title, variant }: { title: string; variant: ThumbnailVariant }) {
	return (
		<PreviewBlock title={title} variant={variant}>
			<TableSilhouette variant={variant} />
		</PreviewBlock>
	);
}

function TableSilhouette({ variant }: { variant: ThumbnailVariant }) {
	const rows = variant === 'flat' ? [0, 1, 2, 3, 4, 5] : [0, 1, 2];

	return (
		<div className={styles.markdownTablePreviewDiv}>
			<div className={cn(variant === 'flat' ? styles.tableSilhouetteDiv : styles.tableSilhouetteDiv2, styles.tableSilhouetteDiv3)} />
			{rows.map((i) => (
				<div key={i} className={cn(styles.tableSilhouetteDiv4, i % 2 === 1 && styles.markdownTablePreviewDiv6)}>
					<div className={cn(styles.tableSilhouetteDiv5, variant === 'flat' ? styles.tableSilhouetteDiv6 : styles.tableSilhouetteDiv7)} />
					<div className={styles.tableSilhouetteDiv8} />
					<div className={cn(styles.tableSilhouetteDiv9, variant === 'flat' ? styles.tableSilhouetteDiv6 : styles.tableSilhouetteDiv7)} />
					<div className={styles.tableSilhouetteDiv8} />
					<div className={cn(styles.tableSilhouetteDiv5, variant === 'flat' ? styles.tableSilhouetteDiv6 : styles.tableSilhouetteDiv7)} />
				</div>
			))}
		</div>
	);
}

function MiniMap({ title, color, variant }: { title: string; color?: string; variant: ThumbnailVariant }) {
	return (
		<PreviewBlock title={title} variant={variant}>
			<MapSilhouette color={color} variant={variant} />
		</PreviewBlock>
	);
}

function MapSilhouette({ color = 'var(--chart-1)', variant }: { color?: string; variant: ThumbnailVariant }) {
	return (
		<div className={styles.mapSilhouetteDiv}>
			<svg
				viewBox='0 0 60 36'
				width='100%'
				height='100%'
				className={cn(styles.mapSilhouetteSvg, variant === 'flat' ? styles.rechartsThumbnailChartContainer3 : styles.mapSilhouetteSvg2)}
				style={{ color }}
			>
				<rect x='0' y='0' width='60' height='36' rx='4px' fill='currentColor' opacity={0.06} />
				<path
					d='M0 11L16 6L30 11L44 5L60 10'
					fill='none'
					stroke='var(--app-text)'
					strokeOpacity={0.1}
					strokeWidth='1'
				/>
				<path
					d='M0 24L14 20L28 25L42 19L60 24'
					fill='none'
					stroke='var(--app-text)'
					strokeOpacity={0.1}
					strokeWidth='1'
				/>
				<path
					d='M20 0L24 12L18 22L23 36'
					fill='none'
					stroke='var(--app-text)'
					strokeOpacity={0.1}
					strokeWidth='1'
				/>
				<path
					d='M42 0L38 14L44 24L40 36'
					fill='none'
					stroke='var(--app-text)'
					strokeOpacity={0.1}
					strokeWidth='1'
				/>
				<MapPin cx={19} cy={14} />
				<MapPin cx={38} cy={22} />
				<MapPin cx={47} cy={11} />
			</svg>
		</div>
	);
}

function MapPin({ cx, cy }: { cx: number; cy: number }) {
	return (
		<path
			d={`M${cx} ${cy - 4.2}C${cx - 1.56} ${cy - 4.2} ${cx - 2.64} ${cy - 3.12} ${cx - 2.64} ${cy - 1.68}C${cx - 2.64} ${cy - 0.12} ${cx} ${cy + 1.8} ${cx} ${cy + 1.8}C${cx} ${cy + 1.8} ${cx + 2.64} ${cy - 0.12} ${cx + 2.64} ${cy - 1.68}C${cx + 2.64} ${cy - 3.12} ${cx + 1.56} ${cy - 4.2} ${cx} ${cy - 4.2}Z`}
			fill='currentColor'
			opacity={0.85}
		/>
	);
}

function GridSilhouette({
	cols,
	widths,
	children,
	variant,
	queryData,
}: {
	cols: number;
	widths: number[] | null;
	children: SummarySegment[];
	variant: ThumbnailVariant;
	queryData?: QueryDataMap | null;
}) {
	const gridCols = Math.min(cols, 3);
	const gridTemplateColumns = widths !== null ? getGridTemplateColumns(widths) : `repeat(${gridCols}, 1fr)`;
	const visibleChildren = widths !== null ? children.slice(0, widths.length * 2) : children.slice(0, gridCols * 2);

	return (
		<div className={cn(styles.kpiSilhouetteDiv6, variant === 'flat' ? styles.gridSilhouetteDiv : styles.gridSilhouetteDiv2)} style={{ gridTemplateColumns }}>
			{visibleChildren.map((child, i) => (
				<SegmentSilhouette key={i} segment={child} variant={variant} queryData={queryData} />
			))}
		</div>
	);
}
