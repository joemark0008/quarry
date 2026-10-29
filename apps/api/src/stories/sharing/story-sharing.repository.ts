import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Upstream `types/mcp-endpoint.ts` `McpEndpointSettings`. The MCP endpoint itself is Phase 6; embeds only read
 * whether it is enabled.
 */
export interface McpEndpointSettings {
	enabled: boolean;
	subAgentModeEnabled: boolean;
	contextLayerModeEnabled: boolean;
	subAgentModel?: { provider: string; modelId: string } | null;
}

export const DEFAULT_MCP_ENDPOINT_SETTINGS: McpEndpointSettings = {
	enabled: false,
	subAgentModeEnabled: true,
	contextLayerModeEnabled: true,
};

/** The reads story sharing needs outside the story repositories: upstream `mcp-endpoint.queries` `getMcpEndpointSettings`. */
@Injectable()
export class StorySharingRepository {
	constructor(private readonly prisma: PrismaService) {}

	/** The project's stored settings, else the built-in defaults with `MCP_ENDPOINT_ENABLED` as the toggle. */
	async getMcpEndpointSettings(projectId: string): Promise<McpEndpointSettings> {
		const row = await this.prisma.project.findUnique({
			where: { id: projectId },
			select: { mcpEndpointSettings: true },
		});
		return (row?.mcpEndpointSettings as McpEndpointSettings | null | undefined) ?? defaultMcpEndpointSettings();
	}
}

function defaultMcpEndpointSettings(): McpEndpointSettings {
	const raw = process.env.MCP_ENDPOINT_ENABLED;
	if (raw !== 'true' && raw !== 'false') {
		return DEFAULT_MCP_ENDPOINT_SETTINGS;
	}
	return { ...DEFAULT_MCP_ENDPOINT_SETTINGS, enabled: raw === 'true' };
}
