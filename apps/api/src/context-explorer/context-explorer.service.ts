import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { HandlerError } from '../common/errors/handler-error.js';
import { ContextExplorerRepository } from './context-explorer.repository.js';
import {
	getFileTree,
	MAX_CONTEXT_FILE_SIZE,
	readFileContent,
	searchFileContents,
	writeFileContent,
} from './files/context-files.js';

export interface ContextExplorerProject {
	id: string;
	path: string | null;
}

const writeFileInputSchema = z.object({
	path: z.string(),
	content: z.string().max(MAX_CONTEXT_FILE_SIZE),
	expectedHash: z.string().regex(/^[a-f0-9]{64}$/),
});

/**
 * Port of upstream tRPC `contextExplorer.*` (`trpc/context-explorer.routes.ts`) without its Git workflow: context
 * files are read and edited in place in the project folder. Inputs are checked with upstream's zod schemas; results
 * keep upstream's shapes.
 */
@Injectable()
export class ContextExplorerService {
	constructor(private readonly repository: ContextExplorerRepository) {}

	async getFileTree(project: ContextExplorerProject) {
		const entries = await getFileTree(requireProjectPath(project.path));
		return { entries };
	}

	async getRulesPreviewGroups(project: ContextExplorerProject) {
		const groups = await this.repository.listActiveUserGroups(project.id);
		return {
			enforced: true as const,
			groups: groups.map(({ id, name, isDefault }) => ({ id, name, isDefault })),
		};
	}

	async readFile(project: ContextExplorerProject, filePath: string) {
		return readFileContent(filePath, requireProjectPath(project.path));
	}

	async writeFile(project: ContextExplorerProject, rawInput: unknown) {
		const input = parseInput(writeFileInputSchema, rawInput);
		return writeFileContent(input.path, input.content, input.expectedHash, requireProjectPath(project.path));
	}

	async searchContent(project: ContextExplorerProject, query: string) {
		const parsedQuery = parseInput(z.string().min(2).max(200), query);
		return searchFileContents(parsedQuery, requireProjectPath(project.path));
	}

	/** The folder new context files are written to: the project folder itself. */
	resolveWriteRoot(project: ContextExplorerProject): string {
		return requireProjectPath(project.path);
	}
}

function requireProjectPath(projectPath: string | null): string {
	if (!projectPath) {
		throw new HandlerError('BAD_REQUEST', 'No project path configured.');
	}
	return projectPath;
}

function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
	const parsed = schema.safeParse(input);
	if (!parsed.success) {
		throw new HandlerError('BAD_REQUEST', parsed.error.issues.map((issue) => issue.message).join('; '));
	}
	return parsed.data;
}
