import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

export interface ContextRulesPreviewGroup {
	id: string;
	name: string;
	isDefault: boolean;
}

/** The context explorer's queries. */
@Injectable()
export class ContextExplorerRepository {
	constructor(private readonly prisma: PrismaService) {}

	/**
	 * Upstream `listActiveUserGroups` for the rules preview. Every group counts as active: upstream locks groups
	 * only past its license limits, and user-group management is Phase 6.
	 */
	listActiveUserGroups(projectId: string): Promise<ContextRulesPreviewGroup[]> {
		return this.prisma.userGroup.findMany({
			where: { projectId },
			select: { id: true, name: true, isDefault: true },
			orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
		});
	}
}
