/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type ModifyPasswordInput = {
  confirmPassword: string;
  newPassword: string;
};

export type UpdateProfileInput = {
  name: string;
};

export type PublicConfigQueryVariables = Exact<{ [key: string]: never; }>;


export type PublicConfigQuery = { publicConfig: { naoMode: string, enableUserLogin: boolean, enableUserSignup: boolean, emailVerificationEnabled: boolean, betaAutomationsEnabled: boolean, betaContextRecommendationsEnabled: boolean, betaStoryFiltersEnabled: boolean, betaSubagentsEnabled: boolean, betaCustomStoriesEnabled: boolean, version: string, authProviders: { google: boolean, github: boolean, gitlab: boolean, smtp: boolean } } };

export type AppVersionQueryVariables = Exact<{ [key: string]: never; }>;


export type AppVersionQuery = { version: { version: string, commit: string, buildDate: string } };

export type CheckUpdateQueryVariables = Exact<{ [key: string]: never; }>;


export type CheckUpdateQuery = { checkUpdate: { currentVersion: string, latestVersion: string | null, updateAvailable: boolean } };

export type HasUsersQueryVariables = Exact<{ [key: string]: never; }>;


export type HasUsersQuery = { hasUsers: boolean };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { id: string, name: string, email: string, image: string | null, emailVerified: boolean, requiresPasswordReset: boolean, isActive: boolean } };

export type UpdateProfileMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateProfileMutation = { updateProfile: { id: string, name: string } };

export type ModifyPasswordMutationVariables = Exact<{
  input: ModifyPasswordInput;
}>;


export type ModifyPasswordMutation = { modifyPassword: boolean };


export const PublicConfigDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PublicConfig"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicConfig"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"naoMode"}},{"kind":"Field","name":{"kind":"Name","value":"enableUserLogin"}},{"kind":"Field","name":{"kind":"Name","value":"enableUserSignup"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerificationEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"betaAutomationsEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"betaContextRecommendationsEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"betaStoryFiltersEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"betaSubagentsEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"betaCustomStoriesEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"authProviders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"google"}},{"kind":"Field","name":{"kind":"Name","value":"github"}},{"kind":"Field","name":{"kind":"Name","value":"gitlab"}},{"kind":"Field","name":{"kind":"Name","value":"smtp"}}]}}]}}]}}]} as unknown as DocumentNode<PublicConfigQuery, PublicConfigQueryVariables>;
export const AppVersionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AppVersion"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"version"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"buildDate"}}]}}]}}]} as unknown as DocumentNode<AppVersionQuery, AppVersionQueryVariables>;
export const CheckUpdateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CheckUpdate"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"checkUpdate"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currentVersion"}},{"kind":"Field","name":{"kind":"Name","value":"latestVersion"}},{"kind":"Field","name":{"kind":"Name","value":"updateAvailable"}}]}}]}}]} as unknown as DocumentNode<CheckUpdateQuery, CheckUpdateQueryVariables>;
export const HasUsersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"HasUsers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasUsers"}}]}}]} as unknown as DocumentNode<HasUsersQuery, HasUsersQueryVariables>;
export const MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"image"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"requiresPasswordReset"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]} as unknown as DocumentNode<MeQuery, MeQueryVariables>;
export const UpdateProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateProfileInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProfile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<UpdateProfileMutation, UpdateProfileMutationVariables>;
export const ModifyPasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ModifyPassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ModifyPasswordInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"modifyPassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<ModifyPasswordMutation, ModifyPasswordMutationVariables>;