import { createFileRoute } from '@tanstack/react-router';
import { EmbedLayout } from '@/feature/embed/embed-layout';

export const Route = createFileRoute('/embed')({
	component: EmbedLayout,
});
