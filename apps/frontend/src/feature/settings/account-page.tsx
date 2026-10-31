import { useNavigate } from '@tanstack/react-router';
import { useMutation } from '@apollo/client/react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { EditProfileDialog } from '@/feature/settings/components/edit-profile-dialog';
import { UpdateProfileDocument } from '@/graphql/generated/graphql';
import { NewsletterSubscribeInlineForm } from '@/feature/settings/components/newsletter-subscribe';
import { useSession } from '@/lib/auth-client';
import { useSignOut } from '@/hooks/use-sign-out';
import { SettingsVersionInfo } from '@/feature/settings/components/version-info';
import { useAuthRoute } from '@/hooks/use-auth-route';
import { usePermissions } from '@/hooks/use-permissions';
import { UserProfileCard } from '@/feature/settings/components/profile-card';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { soundNotificationStorage } from '@/hooks/use-stream-end-sound';
import { useToolCallDensity } from '@/hooks/use-tool-call-density';
import { ThemeSelector } from '@/feature/settings/components/theme-selector';
import { ToolCallDensitySetting } from '@/feature/settings/components/tool-call-density-setting';
import { DangerZone } from '@/feature/settings/components/danger-zone';
import { SettingsMemories } from '@/feature/settings/components/memories';
import { SettingsCard, SettingsPageWrapper } from '@/components/ui/settings-card';
import { SettingsControlRow, SettingsToggleRow } from '@/components/ui/settings-toggle-row';
import { QUARRY_NEWSLETTER_SUBSCRIBE_URL } from '@/lib/quarry-links';
import { refetchProjectQueries } from '@/hooks/use-current-project';
import styles from './account-page.module.css';


export function GeneralPage() {
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

	const handleSignOut = useSignOut();

	return (
		<SettingsPageWrapper>
			<div className={styles.generalPageDiv}>
				<div>
					<h1 className={styles.generalPageH1}>Account</h1>
					<p className={styles.generalPageP}>Manage your account and session.</p>
				</div>
				<div className={styles.generalPageDiv2}>
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
