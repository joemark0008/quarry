import type { ApiInputs, ApiOutputs } from '@/lib/api-types';

import type { SandboxSecretFieldsFragment } from '@/graphql/generated/graphql';
import {
	DeleteSandboxSecretDocument,
	SandboxSecretsDocument,
	SetSandboxSecretDocument,
	UpdateSandboxSecretDescriptionDocument,
} from '@/graphql/generated/graphql';
import { mutation, query, runMutation, runQuery } from '@/lib/apollo-procedures';

type Inputs = ApiInputs['sandboxSecret'];
type Outputs = ApiOutputs['sandboxSecret'];

/**
 * Sandbox secrets moved to apps/api (`lib/apollo-procedures.ts`): call sites swap upstream tRPC's `sandboxSecret.*` for
 * `sandboxApi.sandboxSecret.*`.
 */
export const sandboxApi = {
	sandboxSecret: {
		list: query<void, Outputs['list']>(['sandboxSecret', 'list'], async () =>
			(await runQuery(SandboxSecretsDocument, {})).sandboxSecrets.map(toSandboxSecret),
		),
		set: mutation<Inputs['set'], Outputs['set']>(['sandboxSecret', 'set'], async (input) =>
			toSandboxSecret((await runMutation(SetSandboxSecretDocument, { input })).setSandboxSecret),
		),
		updateDescription: mutation<Inputs['updateDescription'], Outputs['updateDescription']>(
			['sandboxSecret', 'updateDescription'],
			async (input) =>
				toSandboxSecret(
					(await runMutation(UpdateSandboxSecretDescriptionDocument, { input }))
						.updateSandboxSecretDescription,
				),
		),
		delete: mutation<Inputs['delete'], void>(['sandboxSecret', 'delete'], async ({ secretId }) => {
			await runMutation(DeleteSandboxSecretDocument, { secretId });
		}),
	},
};

function toSandboxSecret(secret: SandboxSecretFieldsFragment) {
	return { ...secret, createdAt: new Date(secret.createdAt), updatedAt: new Date(secret.updatedAt) };
}
