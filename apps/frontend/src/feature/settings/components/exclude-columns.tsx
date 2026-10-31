import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SettingsCard } from '@/components/ui/settings-card';
import { SettingsControlRow } from '@/components/ui/settings-toggle-row';
import { Switch } from '@/components/ui/switch';
import { projectApi } from '@/lib/project-api';

interface SettingsExcludeColumnsProps {
	isAdmin: boolean;
}

export function SettingsExcludeColumns({ isAdmin }: SettingsExcludeColumnsProps) {
	const queryClient = useQueryClient();
	const agentSettings = useQuery(projectApi.project.getAgentSettings.queryOptions());

	const updateAgentSettings = useMutation(
		projectApi.project.updateAgentSettings.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: projectApi.project.getAgentSettings.queryOptions().queryKey,
				});
			},
		}),
	);

	const enforceExcludedColumns = agentSettings.data?.sql?.enforceExcludedColumns ?? true;

	const handleEnforcementChange = (enabled: boolean) => {
		updateAgentSettings.mutate({
			sql: { enforceExcludedColumns: enabled },
		});
	};

	return (
		<SettingsCard
			title='Exclude columns'
			description='Enabling this prevents the agent from querying columns listed in exclude_columns.'
		>
			<SettingsControlRow
				id='enforce-excluded-columns'
				label='Enforce excluded columns'
				description='Block SQL queries that access configured excluded columns.'
				control={
					<Switch
						id='enforce-excluded-columns'
						checked={enforceExcludedColumns}
						onCheckedChange={handleEnforcementChange}
						disabled={!isAdmin || agentSettings.isPending || updateAgentSettings.isPending}
					/>
				}
			/>
		</SettingsCard>
	);
}
