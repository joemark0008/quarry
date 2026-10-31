import { createFileRoute } from '@tanstack/react-router';
import { ChartEmbedPage } from '@/feature/embed/chart-embed-page';

export const Route = createFileRoute('/embed/chart/$chartEmbedId')({
	validateSearch: (search: Record<string, unknown>) => ({
		token: typeof search.token === 'string' ? search.token : '',
	}),
	component: ChartEmbedPage,
});
