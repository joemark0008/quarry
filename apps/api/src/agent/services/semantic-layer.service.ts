import type { SemanticLayerMode } from '@quarry/shared/types';

/**
 * The two predicates of upstream `services/semantic-layer.service` the core tools use. The semantic layer itself
 * (MetricFlow compile, `execute_semantic_query`) is Phase 3; without it the mode is null and SQL is always on.
 */
export function isSemanticQueryToolEnabled(mode: SemanticLayerMode | null | undefined): boolean {
	return mode === 'prioritized' || mode === 'exclusive';
}

export function isWarehouseSqlEnabled(mode: SemanticLayerMode | null | undefined): boolean {
	return mode !== 'exclusive';
}
