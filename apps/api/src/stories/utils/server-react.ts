import { createRequire } from 'node:module';
import { dirname } from 'node:path';

import type * as ReactNamespace from 'react';

/**
 * The `react` that `react-dom/server` renders with. The lockfile installs apps/api's own `react` (19.2.5) next to the
 * workspace's `react-dom` (19.3.1, which brings `react` 19.3.1 at the root), and hooks only work with the copy the
 * renderer uses, so `story-html` takes `createContext`/`useContext` from here. With a deduplicated install
 * (`npm dedupe`) this is the same module as `import 'react'`.
 */
const require = createRequire(import.meta.url);
const reactDomDir = dirname(require.resolve('react-dom/package.json'));

export const serverReact = require(require.resolve('react', { paths: [reactDomDir] })) as typeof ReactNamespace;
