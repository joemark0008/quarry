/**
 * Bridge to upstream's `@nao/backend/log` while the frontend still talks to the upstream backend.
 * Replace with the ported definitions when the module that owns them moves to apps/api.
 */
export type * from '../../../../../fork-reference/apps/backend/src/types/log';
