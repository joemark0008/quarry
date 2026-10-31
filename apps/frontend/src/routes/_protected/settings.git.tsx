import { createFileRoute } from '@tanstack/react-router';
import { requireContextAdminOrAdmin } from '@/lib/route-guards';
import { GitSettingsPage } from '@/feature/settings/git-page';

export const Route = createFileRoute('/_protected/settings/git')({
	beforeLoad: requireContextAdminOrAdmin,
	component: GitSettingsPage,
});
