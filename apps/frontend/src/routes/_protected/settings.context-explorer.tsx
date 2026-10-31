import { createFileRoute } from '@tanstack/react-router';
import { validateContextExplorerSearch } from '@/lib/context-explorer-search';
import { requireContextAdminOrAdmin } from '@/lib/route-guards';
import { ContextExplorerPage } from '@/feature/settings/context-explorer-page';

export const Route = createFileRoute('/_protected/settings/context-explorer')({
	beforeLoad: requireContextAdminOrAdmin,
	validateSearch: validateContextExplorerSearch,
	component: ContextExplorerPage,
});
