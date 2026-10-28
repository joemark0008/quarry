import type { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';

import { AuthMiddleware } from './auth/auth.middleware.js';

/**
 * Express setup shared by `main.ts` and the e2e tests. The app is created with `bodyParser: false`:
 * better-auth (`/api/auth/*`) must run before the JSON parser, which would consume its body.
 */
export function configureApp(app: NestExpressApplication): void {
	const auth = app.get(AuthMiddleware);
	app.use((req: express.Request, res: express.Response, next: express.NextFunction) => auth.use(req, res, next));
	app.use(express.json({ limit: '10mb' }));
	app.use(express.urlencoded({ extended: true, limit: '10mb' }));
	app.enableShutdownHooks();
}
