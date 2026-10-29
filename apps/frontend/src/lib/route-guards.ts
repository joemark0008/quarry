import { redirect } from '@tanstack/react-router';

import type { UserRole } from '@quarry/shared/types';
import { fetchPublicConfig } from '@/hooks/use-public-config';
import { fetchCurrentProject } from '@/hooks/use-current-project';
import { canSeeAdvancedSettings } from '@/lib/effective-user-group-features';

export async function requireAdvancedSettingsAccess(pathname: string) {
	if (pathname.startsWith('/settings/account')) {
		return;
	}
	const project = await fetchCurrentProject();
	if (!project) {
		return;
	}
	if (!canSeeAdvancedSettings(project.userRole as UserRole)) {
		throw redirect({ to: '/settings/account' });
	}
}

export async function requireAdmin() {
	const project = await fetchCurrentProject();
	if (!project || project.userRole !== 'admin') {
		throw redirect({ to: '/settings/account' });
	}
}

export async function requireNonCloud() {
	const config = await fetchPublicConfig();
	if (config.quarryMode === 'cloud') {
		throw redirect({ to: '/settings/account' });
	}
}

export async function requireCloud() {
	const config = await fetchPublicConfig();
	if (config.quarryMode !== 'cloud') {
		throw redirect({ to: '/settings/account' });
	}
	return config;
}

export async function requireAdminNonCloud() {
	await requireAdmin();
	await requireNonCloud();
}

export async function requireNonViewerNonCloud() {
	await requireNonViewer();
	await requireNonCloud();
}

export async function requireContextAdminOrAdmin() {
	const project = await fetchCurrentProject();
	if (!project || (project.userRole !== 'admin' && project.userRole !== 'context_admin')) {
		throw redirect({ to: '/settings/account' });
	}
}

export async function requireNonViewer() {
	const project = await fetchCurrentProject();
	if (!project || project.userRole === 'viewer') {
		throw redirect({ to: '/settings/account' });
	}
}
