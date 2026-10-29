import { createFileRoute } from '@tanstack/react-router';
import { McpEndpointSettings } from '@/components/settings/mcp-endpoint';
import { SettingsPageWrapper } from '@/components/ui/settings-card';
import { usePermissions } from '@/hooks/use-permissions';
import { useProjects } from '@/hooks/use-current-project';

export const Route = createFileRoute('/_sidebar-layout/settings/mcp-endpoint')({
	component: McpEndpointPage,
});

function McpEndpointPage() {
	const { isAdmin } = usePermissions();
	const allProjects = useProjects();

	return (
		<SettingsPageWrapper>
			<McpEndpointSettings isAdmin={isAdmin} projects={allProjects.data ?? []} />
		</SettingsPageWrapper>
	);
}
