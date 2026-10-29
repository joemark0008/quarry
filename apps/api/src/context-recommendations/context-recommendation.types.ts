import type { LlmProvider, RepoProvider } from '@quarry/shared/types';

import type {
	ContextRecommendationCategory,
	ContextRecommendationFixKind,
	ContextRecommendationFixTarget,
	ContextRecommendationFrequency,
	ContextRecommendationRootCauseKind,
	ContextRecommendationRunStatus,
	ContextRecommendationRunTrigger,
	ContextRecommendationStatus,
	ProposedEdit,
	RecommendationImpact,
	RecommendationInsight,
} from '../agent/types/context-recommendation.js';
import type {
	ContextRecommendation,
	ContextRecommendationConfig,
	ContextRecommendationRun,
} from '../generated/prisma/client.js';

/** A `context_recommendation` row with its JSON and enum columns typed (upstream `DBContextRecommendation`). */
export type ContextRecommendationRecord = Omit<
	ContextRecommendation,
	| 'status'
	| 'impact'
	| 'insights'
	| 'fixKind'
	| 'fixTarget'
	| 'category'
	| 'rootCauseKind'
	| 'proposedEdits'
	| 'llmProvider'
> & {
	status: ContextRecommendationStatus;
	impact: RecommendationImpact | null;
	insights: RecommendationInsight[];
	fixKind: ContextRecommendationFixKind | null;
	fixTarget: ContextRecommendationFixTarget | null;
	category: ContextRecommendationCategory | null;
	rootCauseKind: ContextRecommendationRootCauseKind | null;
	proposedEdits: ProposedEdit[] | null;
	llmProvider: LlmProvider | null;
};

/** Upstream `NewContextRecommendation`: the insertable columns. */
export type NewContextRecommendation = Pick<
	ContextRecommendationRecord,
	'projectId' | 'runId' | 'fingerprint' | 'suggestedFile' | 'subjectKey' | 'title' | 'summary' | 'suggestedAction'
> &
	Partial<
		Omit<
			ContextRecommendationRecord,
			| 'id'
			| 'projectId'
			| 'runId'
			| 'fingerprint'
			| 'suggestedFile'
			| 'subjectKey'
			| 'title'
			| 'summary'
			| 'suggestedAction'
		>
	>;

export type ContextRecommendationRunRecord = Omit<ContextRecommendationRun, 'status' | 'trigger' | 'llmProvider'> & {
	status: ContextRecommendationRunStatus;
	trigger: ContextRecommendationRunTrigger;
	llmProvider: LlmProvider | null;
};

export type ContextRecommendationConfigRecord = Omit<ContextRecommendationConfig, 'frequency' | 'repoProvider'> & {
	frequency: ContextRecommendationFrequency | null;
	repoProvider: RepoProvider | null;
};

export type ContextRecommendationConfigPatch = Partial<
	Omit<ContextRecommendationConfigRecord, 'projectId' | 'createdAt' | 'updatedAt'>
>;

export interface FeedbackLink {
	recommendationId: string;
	messageId: string;
	chatId: string;
	vote: 'up' | 'down';
	explanation: string | null;
	userName: string;
}

export interface UnlinkedFeedback {
	messageId: string;
	chatId: string;
	explanation: string | null;
	createdAt: Date;
	userName: string;
}

export interface MessageRecommendationLink {
	messageId: string;
	recommendationId: string;
	title: string;
	status: ContextRecommendationStatus;
}

export interface FeedbackOwnershipRow {
	messageId: string;
	recommendationId: string;
	status: ContextRecommendationStatus;
	impactScore: number;
	createdAt: Date;
	insights: RecommendationInsight[];
}
