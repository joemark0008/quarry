/**
 * Bridge to the upstream backend's `shared-chat` export while the frontend still talks to the upstream backend.
 * Replace with the ported definitions when the module that owns them moves to apps/api.
 */
export type * from '../../../../../fork-reference/apps/backend/src/queries/shared-chat.queries';
