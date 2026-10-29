import path from 'node:path';

import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE, ModuleRef } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import type { Response } from 'express';

import { AgentModule } from './agent/agent.module.js';
import { AttachmentsModule } from './attachments/attachments.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ChartsModule } from './charts/charts.module.js';
import { ChatsModule } from './chats/chats.module.js';
import { RequestLoaders } from './common/dataloader/request-loaders.js';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter.js';
import type { GraphQLContext } from './common/graphql-context.js';
import { GuardsModule } from './common/guards/guards.module.js';
import type { QuarryRequest } from './common/request.js';
import { ConfigModule } from './config/config.module.js';
import { ConfigService } from './config/config.service.js';
import { ContextExplorerModule } from './context-explorer/context-explorer.module.js';
import { ContextRecommendationsModule } from './context-recommendations/context-recommendations.module.js';
import { ContextSyncModule } from './context-sync/context-sync.module.js';
import { HealthModule } from './health/health.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { MemoryModule } from './memory/memory.module.js';
import { ModelSettingsModule } from './model-settings/model-settings.module.js';
import { OnboardingModule } from './onboarding/onboarding.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { SandboxModule } from './sandbox/sandbox.module.js';
import { SkillsModule } from './skills/skills.module.js';
import { SystemModule } from './system/system.module.js';
import { TranscribeModule } from './transcribe/transcribe.module.js';
import { UsersModule } from './users/users.module.js';
import { WarehouseModule } from './warehouse/warehouse.module.js';

/** Emitted by the code-first schema; the frontend's GraphQL Code Generator reads it. */
export const SCHEMA_FILE = path.join(import.meta.dirname, '..', 'schema.gql');

@Module({
	imports: [
		ConfigModule,
		PrismaModule,
		GraphQLModule.forRootAsync<ApolloDriverConfig>({
			driver: ApolloDriver,
			inject: [ConfigService, ModuleRef],
			useFactory: (config: ConfigService, moduleRef: ModuleRef) => ({
				autoSchemaFile: SCHEMA_FILE,
				sortSchema: true,
				path: '/graphql',
				playground: false,
				graphiql: config.isDev,
				introspection: config.env.MODE !== 'prod',
				includeStacktraceInErrorResponses: config.isDev,
				context: ({ req, res }: { req: QuarryRequest; res: Response }): GraphQLContext => ({
					req,
					res,
					loaders: new RequestLoaders(moduleRef),
				}),
			}),
		}),
		AuthModule,
		GuardsModule,
		JobsModule,
		HealthModule,
		UsersModule,
		SystemModule,
		ProjectsModule,
		WarehouseModule,
		ContextSyncModule,
		AgentModule,
		AttachmentsModule,
		ChatsModule,
		ChartsModule,
		ModelSettingsModule,
		SandboxModule,
		TranscribeModule,
		ContextExplorerModule,
		ContextRecommendationsModule,
		SkillsModule,
		MemoryModule,
		OnboardingModule,
	],
	providers: [
		{ provide: APP_FILTER, useClass: AllExceptionsFilter },
		{ provide: APP_PIPE, useValue: new ValidationPipe({ transform: true, forbidUnknownValues: false }) },
	],
})
export class AppModule {}
