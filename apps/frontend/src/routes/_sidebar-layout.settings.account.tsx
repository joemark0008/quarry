import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation } from '@apollo/client/react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { EditProfileDialog } from '@/components/settings/edit-profile-dialog';
import { UpdateProfileDocument } from '@/graphql/generated/graphql';
import { NewsletterSubscribeInlineForm } from '@/components/newsletter-subscribe';
import { signOut, useSession } from '@/lib/auth-client';
import { SettingsVersionInfo } from '@/components/settings/version-info';
import { useAuthRoute } from '@/hooks/use-auth-route';
import { usePermissions } from '@/hooks/use-permissions';
import { UserProfileCard } from '@/components/settings/profile-card';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { soundNotificationStorage } from '@/hooks/use-stream-end-sound';
import { useToolCallDensity } from '@/hooks/use-tool-call-density';
import { ThemeSelector } from '@/components/settings/theme-selector';
import { ToolCallDensitySetting } from '@/components/settings/tool-call-density-setting';
import { DangerZone } from '@/components/settings/danger-zone';
import { SettingsMemories } from '@/components/settings/memories';
import { SettingsCard, SettingsPageWrapper } from '@/components/ui/settings-card';
import { SettingsControlRow, SettingsToggleRow } from '@/components/ui/settings-toggle-row';
import { clearApolloCache } from '@/lib/apollo-client';
import { QUARRY_NEWSLETTER_SUBSCRIBE_URL } from '@/lib/quarry-links';
import { refetchProjectQueries } from '@/hooks/use-current-project';

export const Route = createFileRoute('/_sidebar-layout/settings/account')({
	component: GeneralPage,
});

function GeneralPage() {
	const navigate = useNavigate();
	const { data: session, refetch } = useSession();
	const user = session?.user;
	const queryClient = useQueryClient();
	const { isAdmin, isViewer } = usePermissions();
	const [soundEnabled, setSoundEnabled] = useLocalStorage(soundNotificationStorage);
	const [toolCallDensity, setToolCallDensity, toolCallDensityState] = useToolCallDensity();

	const navigation = useAuthRoute();

	const [editOpen, setEditOpen] = useState(false);

	const [updateProfile] = useMutation(UpdateProfileDocument);

	const handleEdit = async (name: string) => {
		await updateProfile({ variables: { input: { name } } });
		await refetchProjectQueries();
		await refetch();
	};

	const handleSignOut = async () => {
		queryClient.clear();
		await clearApolloCache();
		await signOut({
			fetchOptions: {
				onSuccess: () => {
					navigate({ to: navigation });
				},
			},
		});
	};

	return (
		<SettingsPageWrapper>
			<div className='flex flex-col gap-5'>
				<div>
					<h1 className='text-lg font-semibold text-foreground'>Account</h1>
					<p className='text-sm text-muted-foreground'>Manage your account and session.</p>
				</div>
				<div className='flex flex-col gap-12'>
					<UserProfileCard
						name={user?.name}
						email={user?.email}
						onEdit={() => setEditOpen(true)}
						onSignOut={handleSignOut}
					/>

					<EditProfileDialog
						open={editOpen}
						onOpenChange={setEditOpen}
						name={user?.name}
						onSubmit={handleEdit}
					/>

					<SettingsCard title='General Settings' divide>
						<SettingsToggleRow
							id='sound-notification'
							label='Sound notification'
							description='Play a sound when the agent finishes responding.'
							checked={soundEnabled}
							onCheckedChange={setSoundEnabled}
						/>
						<ToolCallDensitySetting
							value={toolCallDensity}
							onValueChange={setToolCallDensity}
							canChange={toolCallDensityState.canChange}
							isLoading={toolCallDensityState.isLoading}
						/>
						<SettingsControlRow
							label='Theme'
							description='Choose how quarry looks.'
							control={<ThemeSelector />}
						/>
						{QUARRY_NEWSLETTER_SUBSCRIBE_URL && (
							<SettingsControlRow
								label='Newsletter'
								description='Get product updates, release notes, and analytics agent tips.'
								control={<NewsletterSubscribeInlineForm initialEmail={user?.email} />}
							/>
						)}
					</SettingsCard>

					<SettingsMemories isAdmin={isAdmin} />

					{!isViewer && <DangerZone />}
				</div>
			</div>
			{isAdmin && <SettingsVersionInfo />}
		</SettingsPageWrapper>
	);
}
