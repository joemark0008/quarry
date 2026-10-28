/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "query PublicConfig {\n  publicConfig {\n    naoMode\n    enableUserLogin\n    enableUserSignup\n    emailVerificationEnabled\n    betaAutomationsEnabled\n    betaContextRecommendationsEnabled\n    betaStoryFiltersEnabled\n    betaSubagentsEnabled\n    betaCustomStoriesEnabled\n    version\n    authProviders {\n      google\n      github\n      gitlab\n      smtp\n    }\n  }\n}\n\nquery AppVersion {\n  version {\n    version\n    commit\n    buildDate\n  }\n}\n\nquery CheckUpdate {\n  checkUpdate {\n    currentVersion\n    latestVersion\n    updateAvailable\n  }\n}": typeof types.PublicConfigDocument,
    "query HasUsers {\n  hasUsers\n}\n\nquery Me {\n  me {\n    id\n    name\n    email\n    image\n    emailVerified\n    requiresPasswordReset\n    isActive\n  }\n}\n\nmutation UpdateProfile($input: UpdateProfileInput!) {\n  updateProfile(input: $input) {\n    id\n    name\n  }\n}\n\nmutation ModifyPassword($input: ModifyPasswordInput!) {\n  modifyPassword(input: $input)\n}": typeof types.HasUsersDocument,
};
const documents: Documents = {
    "query PublicConfig {\n  publicConfig {\n    naoMode\n    enableUserLogin\n    enableUserSignup\n    emailVerificationEnabled\n    betaAutomationsEnabled\n    betaContextRecommendationsEnabled\n    betaStoryFiltersEnabled\n    betaSubagentsEnabled\n    betaCustomStoriesEnabled\n    version\n    authProviders {\n      google\n      github\n      gitlab\n      smtp\n    }\n  }\n}\n\nquery AppVersion {\n  version {\n    version\n    commit\n    buildDate\n  }\n}\n\nquery CheckUpdate {\n  checkUpdate {\n    currentVersion\n    latestVersion\n    updateAvailable\n  }\n}": types.PublicConfigDocument,
    "query HasUsers {\n  hasUsers\n}\n\nquery Me {\n  me {\n    id\n    name\n    email\n    image\n    emailVerified\n    requiresPasswordReset\n    isActive\n  }\n}\n\nmutation UpdateProfile($input: UpdateProfileInput!) {\n  updateProfile(input: $input) {\n    id\n    name\n  }\n}\n\nmutation ModifyPassword($input: ModifyPasswordInput!) {\n  modifyPassword(input: $input)\n}": types.HasUsersDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query PublicConfig {\n  publicConfig {\n    naoMode\n    enableUserLogin\n    enableUserSignup\n    emailVerificationEnabled\n    betaAutomationsEnabled\n    betaContextRecommendationsEnabled\n    betaStoryFiltersEnabled\n    betaSubagentsEnabled\n    betaCustomStoriesEnabled\n    version\n    authProviders {\n      google\n      github\n      gitlab\n      smtp\n    }\n  }\n}\n\nquery AppVersion {\n  version {\n    version\n    commit\n    buildDate\n  }\n}\n\nquery CheckUpdate {\n  checkUpdate {\n    currentVersion\n    latestVersion\n    updateAvailable\n  }\n}"): (typeof documents)["query PublicConfig {\n  publicConfig {\n    naoMode\n    enableUserLogin\n    enableUserSignup\n    emailVerificationEnabled\n    betaAutomationsEnabled\n    betaContextRecommendationsEnabled\n    betaStoryFiltersEnabled\n    betaSubagentsEnabled\n    betaCustomStoriesEnabled\n    version\n    authProviders {\n      google\n      github\n      gitlab\n      smtp\n    }\n  }\n}\n\nquery AppVersion {\n  version {\n    version\n    commit\n    buildDate\n  }\n}\n\nquery CheckUpdate {\n  checkUpdate {\n    currentVersion\n    latestVersion\n    updateAvailable\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "query HasUsers {\n  hasUsers\n}\n\nquery Me {\n  me {\n    id\n    name\n    email\n    image\n    emailVerified\n    requiresPasswordReset\n    isActive\n  }\n}\n\nmutation UpdateProfile($input: UpdateProfileInput!) {\n  updateProfile(input: $input) {\n    id\n    name\n  }\n}\n\nmutation ModifyPassword($input: ModifyPasswordInput!) {\n  modifyPassword(input: $input)\n}"): (typeof documents)["query HasUsers {\n  hasUsers\n}\n\nquery Me {\n  me {\n    id\n    name\n    email\n    image\n    emailVerified\n    requiresPasswordReset\n    isActive\n  }\n}\n\nmutation UpdateProfile($input: UpdateProfileInput!) {\n  updateProfile(input: $input) {\n    id\n    name\n  }\n}\n\nmutation ModifyPassword($input: ModifyPasswordInput!) {\n  modifyPassword(input: $input)\n}"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;