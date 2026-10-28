import { usePublicConfig } from '@/hooks/use-public-config';

export function useCustomStoriesEnabled(): boolean {
	const config = usePublicConfig();
	return config.data?.betaCustomStoriesEnabled === true;
}
