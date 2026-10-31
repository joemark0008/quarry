import { createFileRoute } from '@tanstack/react-router';
import { StoriesPage } from '@/feature/stories/stories-page';

export const Route = createFileRoute('/_protected/stories/')({
	validateSearch: (search: Record<string, unknown>) => ({
		folderId: typeof search.folderId === 'string' ? search.folderId : null,
	}),
	component: StoriesPage,
});
