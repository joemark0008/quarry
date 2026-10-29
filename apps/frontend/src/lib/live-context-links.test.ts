import { describe, expect, it } from 'vitest';

import { buildCommitUrl } from './live-context-links';
import type { LiveContextRepository } from './live-context-links';

const commit = 'a'.repeat(40);

describe('live context repository links', () => {
	it.each([
		['github', 'https://github.com/quarry/context.git', `https://github.com/quarry/context/commit/${commit}`],
		['gitlab', 'https://gitlab.com/quarry/context', `https://gitlab.com/quarry/context/-/commit/${commit}`],
		['bitbucket', 'https://bitbucket.org/quarry/context', `https://bitbucket.org/quarry/context/commits/${commit}`],
	] as const)('builds %s commit links', (platform, repositoryUrl, commitUrl) => {
		const repository: LiveContextRepository = {
			repositoryUrl,
			platform,
		};

		expect(buildCommitUrl(repository, commit)).toBe(commitUrl);
	});

	it.each([
		{ repositoryUrl: 'git@github.com:quarry/context.git', platform: 'github' as const },
		{ repositoryUrl: 'https://user:secret@github.com/quarry/context', platform: 'github' as const },
		{ repositoryUrl: 'https://github.com/quarry/context', platform: null },
		{ repositoryUrl: 'https://github.com', platform: 'github' as const },
	])('does not build links from unavailable or unsafe repository metadata', (repository) => {
		expect(buildCommitUrl(repository, commit)).toBeNull();
	});

	it('rejects invalid commits', () => {
		const repository: LiveContextRepository = {
			repositoryUrl: 'https://github.com/quarry/context',
			platform: 'github',
		};

		expect(buildCommitUrl(repository, 'abc1234')).toBeNull();
	});
});
