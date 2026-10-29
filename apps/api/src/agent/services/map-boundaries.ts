import type { CustomBoundarySet } from '@quarry/shared';

/**
 * Stand-in for upstream `projectQueries.getCustomBoundaries` (project map settings arrive with Phase 2d): no project
 * defines custom GeoJSON boundary sets yet, so `display_map` offers the built-in ones only.
 */
export async function getCustomBoundaries(_projectId: string): Promise<CustomBoundarySet[]> {
	return [];
}
