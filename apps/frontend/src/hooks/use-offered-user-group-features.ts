import { USER_GROUP_FEATURE_DEFINITIONS } from '@quarry/shared';
import type { UserGroupFeatureDefinition } from '@quarry/shared';

import { useCustomStoriesEnabled } from '@/hooks/use-custom-stories-enabled';

/** The features this instance offers: custom stories only appear while the instance has them enabled. */
export function useOfferedUserGroupFeatures(): ReadonlyArray<UserGroupFeatureDefinition> {
	const customStoriesEnabled = useCustomStoriesEnabled();
	return customStoriesEnabled
		? USER_GROUP_FEATURE_DEFINITIONS
		: USER_GROUP_FEATURE_DEFINITIONS.filter((feature) => feature.key !== 'customStoryCreation');
}
