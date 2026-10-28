import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module.js';
import { ConfigService } from './config/config.service.js';

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);
	app.enableShutdownHooks();

	const config = app.get(ConfigService);
	await app.listen(config.env.PORT);
	Logger.log(`quarry api listening on http://localhost:${config.env.PORT}`, 'Bootstrap');
}

void bootstrap();
