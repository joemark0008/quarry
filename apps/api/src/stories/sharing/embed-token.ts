import crypto from 'node:crypto';

import { MCP_EMBED_TOKEN_TTL_MS } from '@quarry/shared';
import type { EmbedTokenPayload, McpEmbedKind } from '@quarry/shared/types';

import { HandlerError } from '../../common/errors/handler-error.js';
import { mcpEndpointQueries } from './sharing-queries.js';

/** Port of upstream `utils/embed-token.ts`: HMAC-signed embed tokens (keyed by `BETTER_AUTH_SECRET`). */

const SEPARATOR = '.';

/** The app's config parses `BETTER_AUTH_SECRET` with a random default; this keeps one per process the same way. */
let fallbackSecret: string | null = null;

function embedSecret(): string {
	const secret = process.env.BETTER_AUTH_SECRET;
	if (secret && secret.length >= 20) {
		return secret;
	}
	fallbackSecret ??= crypto.randomBytes(32).toString('hex');
	return fallbackSecret;
}

export function generateEmbedToken(type: McpEmbedKind, resourceId: string, projectId: string): string {
	const payload: EmbedTokenPayload = { type, resourceId, projectId, exp: Date.now() + MCP_EMBED_TOKEN_TTL_MS };
	const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
	const sig = crypto.createHmac('sha256', embedSecret()).update(payloadB64).digest('base64url');
	return `${payloadB64}${SEPARATOR}${sig}`;
}

export function verifyEmbedToken(token: string): EmbedTokenPayload | null {
	const sep = token.lastIndexOf(SEPARATOR);
	if (sep === -1) {
		return null;
	}
	const payloadB64 = token.slice(0, sep);
	const sig = token.slice(sep + 1);
	if (!payloadB64 || !sig) {
		return null;
	}

	const expectedSig = crypto.createHmac('sha256', embedSecret()).update(payloadB64).digest('base64url');
	try {
		if (!crypto.timingSafeEqual(Buffer.from(sig, 'base64url'), Buffer.from(expectedSig, 'base64url'))) {
			return null;
		}
	} catch {
		return null;
	}

	let payload: EmbedTokenPayload;
	try {
		payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as EmbedTokenPayload;
	} catch {
		return null;
	}
	if (payload.exp < Date.now()) {
		return null;
	}
	return payload;
}

export async function assertProjectMcpEnabled(projectId: string): Promise<void> {
	const settings = await mcpEndpointQueries.getMcpEndpointSettings(projectId);
	if (!settings.enabled) {
		throw new HandlerError('FORBIDDEN', 'Embeds are disabled because MCP is turned off for this workspace.');
	}
}
