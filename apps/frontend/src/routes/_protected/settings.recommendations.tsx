import { createFileRoute } from '@tanstack/react-router';
import { validateRecommendationsSearch } from '@/feature/settings/components/recommendations-route-search';
import { requireContextAdminOrAdmin } from '@/lib/route-guards';
import { RecommendationsPage } from '@/feature/settings/recommendations-page';

export const Route = createFileRoute('/_protected/settings/recommendations')({
	beforeLoad: requireContextAdminOrAdmin,
	validateSearch: validateRecommendationsSearch,
	component: RecommendationsPage,
});
