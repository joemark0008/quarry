import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { ProjectAccess, ProjectAdmin } from '../common/decorators/access.decorator.js';
import { CurrentProject } from '../common/decorators/current.decorator.js';
import type { Project } from '../generated/prisma/client.js';
import { WarehouseConnectionInput } from './dto/warehouse-connection.input.js';
import { WarehouseConnection, WarehouseConnectionResult } from './models/warehouse-connection.model.js';
import { WarehouseConnectionService } from './warehouse-connection.service.js';

@Resolver(() => WarehouseConnection)
export class WarehouseResolver {
	constructor(private readonly connections: WarehouseConnectionService) {}

	@ProjectAccess()
	@Query(() => [WarehouseConnection], { description: 'Databases configured in the selected project.' })
	warehouseConnections(@CurrentProject() project: Project): Promise<WarehouseConnection[]> {
		return this.connections.listConnections(project);
	}

	@ProjectAdmin()
	@Mutation(() => WarehouseConnectionResult, {
		description: 'Checks the credentials on a live connection, then saves them (encrypted) for the project.',
	})
	connectWarehouse(
		@CurrentProject() project: Project,
		@Args('input') input: WarehouseConnectionInput,
	): Promise<WarehouseConnectionResult> {
		return this.connections.connect(project, input);
	}

	@ProjectAdmin()
	@Mutation(() => WarehouseConnectionResult)
	testWarehouseConnection(
		@CurrentProject() project: Project,
		@Args('name', { type: () => String, nullable: true }) name?: string | null,
	): Promise<WarehouseConnectionResult> {
		return this.connections.testConnection(project, name);
	}

	@ProjectAdmin()
	@Mutation(() => Boolean)
	async disconnectWarehouse(@CurrentProject() project: Project, @Args('name') name: string): Promise<boolean> {
		await this.connections.disconnect(project, name);
		return true;
	}
}
