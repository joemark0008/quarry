import { createFileRoute } from '@tanstack/react-router';
import { MapEmbedPage } from '@/feature/embed/map-embed-page';

export const Route = createFileRoute('/embed/map/$mapEmbedId')({
	validateSearch: (search: Record<string, unknown>) => ({
		token: typeof search.token === 'string' ? search.token : '',
	}),
	component: MapEmbedPage,
});
