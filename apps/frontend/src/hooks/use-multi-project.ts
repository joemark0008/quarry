import { usePublicConfig } from '@/hooks/use-public-config';

export type ProjectSwitcherMode = 'switch' | 'static';

export function useMultiProject(): ProjectSwitcherMode {
	const config = usePublicConfig();

	return config.data?.naoMode === 'cloud' ? 'switch' : 'static';
}
