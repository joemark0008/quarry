import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';

import type { AuthUser } from '../auth/auth.service.js';
import { ProjectNonViewer } from '../common/decorators/access.decorator.js';
import { CurrentProject, CurrentUser } from '../common/decorators/current.decorator.js';
import { HandlerError } from '../common/errors/handler-error.js';
import type { Project } from '../generated/prisma/client.js';
import { SetSandboxSecretInput, UpdateSandboxSecretDescriptionInput } from './dto/sandbox-secret.input.js';
import { SandboxSecret } from './models/sandbox-secret.model.js';
import { SandboxSecretService } from './sandbox-secret.service.js';

/** Settings → Agent → Sandbox secrets (upstream tRPC `sandboxSecret.*`, all `nonViewerProtectedProcedure`). */
@Resolver(() => SandboxSecret)
export class SandboxSecretResolver {
	constructor(private readonly secrets: SandboxSecretService) {}

	@ProjectNonViewer()
	@Query(() => [SandboxSecret], { description: "The signed-in user's sandbox secrets in the project." })
	sandboxSecrets(@CurrentUser() user: AuthUser, @CurrentProject() project: Project): Promise<SandboxSecret[]> {
		return this.secrets.list(user.id, project.id);
	}

	@ProjectNonViewer()
	@Mutation(() => SandboxSecret, {
		description: 'Creates a secret, or replaces the value of the one with that name.',
	})
	setSandboxSecret(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project,
		@Args('input') input: SetSandboxSecretInput,
	): Promise<SandboxSecret> {
		return this.secrets.set(user.id, project.id, input);
	}

	@ProjectNonViewer()
	@Mutation(() => SandboxSecret)
	async updateSandboxSecretDescription(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project,
		@Args('input') input: UpdateSandboxSecretDescriptionInput,
	): Promise<SandboxSecret> {
		const updated = await this.secrets.updateDescription(user.id, project.id, input.secretId, input.description);
		if (!updated) {
			throw new HandlerError('NOT_FOUND', 'Secret not found.');
		}
		return updated;
	}

	@ProjectNonViewer()
	@Mutation(() => Boolean)
	async deleteSandboxSecret(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project,
		@Args('secretId', { type: () => ID }) secretId: string,
	): Promise<boolean> {
		const deleted = await this.secrets.delete(user.id, project.id, secretId);
		if (!deleted) {
			throw new HandlerError('NOT_FOUND', 'Secret not found.');
		}
		return true;
	}
}
