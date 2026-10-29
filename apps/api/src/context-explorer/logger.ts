export { logger } from '../agent/utils/logger.js';

/** Upstream `utils/logger` `serializeError`: error details for log context, with credentials stripped from URLs. */
export function serializeError(error: unknown): Record<string, unknown> {
	if (error instanceof Error) {
		return {
			name: error.name,
			message: redactCredentialedUrls(error.message),
			stack: error.stack ? redactCredentialedUrls(error.stack) : error.stack,
		};
	}
	return { value: redactCredentialedUrls(String(error)) };
}

function redactCredentialedUrls(value: string): string {
	return value.replace(/:\/\/[^/\s@]+@/g, '://***@');
}
