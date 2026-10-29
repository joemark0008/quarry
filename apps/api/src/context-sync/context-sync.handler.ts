import { Injectable } from '@nestjs/common';

import { Job } from '../jobs/job.decorator.js';
import { CONTEXT_SYNC_JOB, type ContextSyncJobData, ContextSyncService } from './context-sync.service.js';

/** pg-boss handler of the `context.sync` job (port of `nao sync`, PLAN.md §7). */
@Injectable()
export class ContextSyncHandler {
	constructor(private readonly contextSync: ContextSyncService) {}

	/** A failed sync is recorded in the sync status; the user re-runs it, so the job is not retried. */
	@Job(CONTEXT_SYNC_JOB, { retryLimit: 0, expireInSeconds: 3600 })
	async handle(data: ContextSyncJobData): Promise<void> {
		await this.contextSync.runSync(data.projectId, data.select ?? []);
	}
}
