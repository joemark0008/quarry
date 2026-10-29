/**
 * Bridge to the upstream backend's `provider-meta` export while the frontend still talks to the upstream backend.
 * Replace with the ported definitions when the module that owns them moves to apps/api.
 */
export * from '../../../../../fork-reference/apps/backend/src/agents/provider-meta';
