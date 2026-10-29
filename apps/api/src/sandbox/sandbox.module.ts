import { Module } from '@nestjs/common';

import { SandboxSecretRepository } from './sandbox-secret.repository.js';
import { SandboxSecretResolver } from './sandbox-secret.resolver.js';
import { SandboxSecretService } from './sandbox-secret.service.js';

/**
 * Sandbox secrets (upstream `sandbox-secret.*`): the GraphQL settings API, and the service the agent uses to list
 * them in the system prompt and hand them to `execute_sandboxed_code`. The runtime is `agent/services/sandbox-runtime`.
 */
@Module({
	providers: [SandboxSecretRepository, SandboxSecretService, SandboxSecretResolver],
	exports: [SandboxSecretService],
})
export class SandboxModule {}
