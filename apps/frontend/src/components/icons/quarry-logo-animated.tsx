import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

type QuarryLogoAnimatedProps = {
	className?: string;
	style?: CSSProperties;
	width?: number | string;
	height?: number | string;
	durationSeconds?: number;
	loop?: boolean;
	title?: string;
	/** One-colour variant: the facets become tints of this colour instead of the brand palette. */
	color?: string;
};

/** The quarry mark (brand/svg/quarry-mark.svg): a hexagon cut into facets, drawn on a 46×46 box at (5, 5). */
const CENTER = '28,28';

type Facet = {
	points: string;
	fill: string;
	/** Fraction of the cycle at which the facet starts growing, is complete, starts shrinking and is gone. */
	growStart: number;
	growEnd: number;
	shrinkStart: number;
	shrinkEnd: number;
};

const FACETS: Facet[] = [
	{
		points: '28,6 47,17 47,39 28,50 9,39 9,17',
		fill: '#0F6E56',
		growStart: 0,
		growEnd: 0.18,
		shrinkStart: 0.82,
		shrinkEnd: 0.97,
	},
	{ points: '28,6 47,17 28,28', fill: '#1D9E75', growStart: 0.18, growEnd: 0.32, shrinkStart: 0.72, shrinkEnd: 0.84 },
	{ points: '9,17 28,28 9,39', fill: '#085041', growStart: 0.3, growEnd: 0.44, shrinkStart: 0.7, shrinkEnd: 0.82 },
	{ points: '28,28 47,39 28,50', fill: '#EF9F27', growStart: 0.42, growEnd: 0.56, shrinkStart: 0.68, shrinkEnd: 0.8 },
];

/** Same number of points as the facet, all at the centre, so `points` can morph between the two. */
function collapsed(points: string): string {
	return points
		.split(' ')
		.map(() => CENTER)
		.join(' ');
}

function buildMorph(facet: Facet, loop: boolean): { values: string; keyTimes: string } {
	const empty = collapsed(facet.points);
	const frames: Array<[number, string]> = loop
		? [
				[0, empty],
				[facet.growStart, empty],
				[facet.growEnd, facet.points],
				[facet.shrinkStart, facet.points],
				[facet.shrinkEnd, empty],
				[1, empty],
			]
		: [
				[0, empty],
				[facet.growStart, empty],
				[facet.growEnd, facet.points],
				[1, facet.points],
			];

	const values: string[] = [];
	const keyTimes: string[] = [];
	let lastKeyTime = -1;
	for (const [time, points] of frames) {
		const rounded = Number(time.toFixed(4));
		if (rounded <= lastKeyTime) {
			continue;
		}
		lastKeyTime = rounded;
		keyTimes.push(String(rounded));
		values.push(points);
	}
	return { values: values.join(';'), keyTimes: keyTimes.join(';') };
}

function tint(color: string, index: number): string {
	return [
		color,
		`color-mix(in srgb, ${color}, white 25%)`,
		`color-mix(in srgb, ${color}, black 25%)`,
		`color-mix(in srgb, ${color}, white 45%)`,
	][index];
}

function usePrefersReducedMotion(): boolean {
	const [reduced, setReduced] = useState(false);
	useEffect(() => {
		if (typeof window === 'undefined' || !window.matchMedia) {
			return;
		}
		const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
		setReduced(mql.matches);
		const onChange = () => setReduced(mql.matches);
		mql.addEventListener('change', onChange);
		return () => mql.removeEventListener('change', onChange);
	}, []);
	return reduced;
}

/** Loading animation built from the quarry mark: the facets grow out of the centre one after another. */
export default function QuarryLogoAnimated({
	className,
	style,
	width = 46,
	height = 46,
	durationSeconds = 2.2,
	loop = true,
	title = 'quarry',
	color,
}: QuarryLogoAnimatedProps) {
	const reducedMotion = usePrefersReducedMotion();
	const dur = `${durationSeconds}s`;
	const repeatCount = loop ? 'indefinite' : 1;

	return (
		<svg
			width={width}
			height={height}
			viewBox='5 5 46 46'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			className={className}
			style={style}
			role='img'
			aria-label={title}
		>
			<title>{title}</title>
			{FACETS.map((facet, index) => {
				const { values, keyTimes } = buildMorph(facet, loop);
				return (
					<polygon
						key={facet.fill}
						points={reducedMotion ? facet.points : collapsed(facet.points)}
						fill={color ? tint(color, index) : facet.fill}
					>
						{!reducedMotion && (
							<animate
								attributeName='points'
								values={values}
								keyTimes={keyTimes}
								dur={dur}
								calcMode='spline'
								keySplines={values
									.split(';')
									.slice(1)
									.map(() => '0.33 0 0.67 1')
									.join(';')}
								repeatCount={repeatCount}
								fill='freeze'
							/>
						)}
					</polygon>
				);
			})}
		</svg>
	);
}
