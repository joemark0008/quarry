import { MAX_IMAGE_SIZE_MB } from '@quarry/shared/attachments';
import { describe, expect, it } from 'vitest';

import { AgentRequestSchema, AgentRequestUserMessageSchema } from './chat.js';

describe('AgentRequestUserMessageSchema', () => {
	it('enforces the decoded image size limit on the server schema', () => {
		const oversized = Buffer.alloc(MAX_IMAGE_SIZE_MB * 1024 * 1024 + 1).toString('base64');
		const parsed = AgentRequestUserMessageSchema.safeParse({
			text: '',
			images: [{ mediaType: 'image/png', data: oversized }],
		});

		expect(parsed.success).toBe(false);
	});
});

describe('agent chat modes', () => {
	it('accepts explicit example chat requests', () => {
		const request = AgentRequestSchema.parse({ message: { text: 'Show me revenue' }, mode: 'example' });
		expect(request.mode).toBe('example');
	});

	// Upstream's `getChatModeMismatchError` (services/agent-run.ts) is not ported: onboarding chats are not in quarry yet.
});
