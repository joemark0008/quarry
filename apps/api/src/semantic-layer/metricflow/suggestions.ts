/** Closest candidates to a mistyped name, best first (MetricFlow lists up to six). */
export function suggest(input: string, candidates: Iterable<string>, limit = 6): string[] {
	const needle = input.toLowerCase();
	return [...new Set(candidates)]
		.map((candidate) => ({ candidate, score: similarity(needle, candidate.toLowerCase()) }))
		.filter(({ score }) => score > 0.3)
		.sort((a, b) => b.score - a.score || a.candidate.localeCompare(b.candidate))
		.slice(0, limit)
		.map(({ candidate }) => candidate);
}

/** MetricFlow-style resolution error: what went wrong, the suggestions, and the input that caused it. */
export function resolutionErrorMessage(message: string, input: string, suggestions: string[] = []): string {
	const lines = ['Got error(s) during query resolution.', '', 'Error #1:', '  Message:', '', `    ${message}`];
	if (suggestions.length > 0) {
		lines.push('', '    Suggestions:', `      [${suggestions.map((name) => `'${name}'`).join(', ')}]`);
	}
	lines.push('', '  Query Input:', '', `    ${input}`);
	return lines.join('\n');
}

function similarity(a: string, b: string): number {
	if (a === b) {
		return 1;
	}
	const ratio = 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);
	const contains = a.length > 2 && (b.includes(a) || a.includes(b)) ? 0.3 : 0;
	return Math.min(ratio + contains, 0.99);
}

function levenshtein(a: string, b: string): number {
	let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
	for (let i = 1; i <= a.length; i++) {
		const current = [i];
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
		}
		previous = current;
	}
	return previous[b.length];
}
