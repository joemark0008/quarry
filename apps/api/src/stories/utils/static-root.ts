import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

/** Where `npm run dev:frontend` serves the frontend; the backend redirects to it and reads story runtime files from it. */
export const FRONTEND_DEV_ORIGIN = 'http://localhost:3000';

const moduleDir = dirname(fileURLToPath(import.meta.url));

/**
 * Port of upstream `utils/static-root.ts`: the built frontend, `apps/frontend/dist`, reached from
 * `apps/api/src/stories/utils/` (or `apps/api/dist/stories/utils/` once built), or a `public` folder next to the server.
 */
export const staticRoot = [join(moduleDir, '../../../public'), join(moduleDir, '../../../../frontend/dist')].find(
	(path) => existsSync(path),
);
