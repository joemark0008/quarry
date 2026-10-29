/**
 * Project-scoped, read-only views over the app tables. They are the only surface `query_app_db` can read.
 *
 * Port of upstream `db/app-db-views.ts`. Upstream builds these bodies from its Drizzle schema at runtime;
 * quarry has no Drizzle, so the bodies below are the exact PostgreSQL that upstream's Drizzle builder
 * generates for Postgres, kept as constants. Their table and column names match quarry's Prisma
 * schema (`@@map` / `@map` names in `prisma/schema.prisma`).
 *
 * Each view filters to the single project id held in the `_scope` temp table (bound via a parameter at
 * runtime, never interpolated into SQL).
 */
export interface ScopedView {
	name: string;
	/** The SELECT body the view is created from (no trailing semicolon). */
	body: string;
	/** Columns the view exposes, in select order. */
	columns: string[];
}

const SCOPED_VIEWS: readonly ScopedView[] = [
	{
		name: 'v_messages',
		body: `select "chat_message"."chat_id", "chat_message"."id" as "message_id", "chat"."user_id", "user"."name" as "user_name", "chat"."title", "chat_message"."role", "message_part"."type", "message_part"."text", "chat_message"."stop_reason", "chat_message"."error_message", "chat_message"."llm_provider", "chat_message"."llm_model_id", "chat_message"."input_total_tokens", "chat_message"."input_no_cache_tokens", "chat_message"."input_cache_read_tokens", "chat_message"."input_cache_write_tokens", "chat_message"."output_total_tokens", "chat_message"."output_text_tokens", "chat_message"."output_reasoning_tokens", "chat_message"."total_tokens", "chat_message"."superseded_at" as "superseded_at", "chat_message"."source" as "message_source", (
		select source_message.source
		from "chat_message" as source_message
		where source_message.chat_id = "chat"."id"
			and source_message.role = 'user'
			and source_message.superseded_at is null
		order by source_message.created_at asc
		limit 1
	) as "chat_source", "message_part"."tool_name", "message_part"."tool_call_id", "message_part"."tool_state", "message_part"."tool_error_text", "message_part"."tool_input", "message_part"."tool_output", "message_feedback"."vote", "message_feedback"."explanation", "message_part"."created_at" as "created_at" from "message_part" left join "message_feedback" on ("message_part"."message_id" = "message_feedback"."message_id" and "message_part"."order" = ((select min("order") from "message_part" "sibling_part" where "sibling_part"."message_id" = "message_part"."message_id"))) left join "chat_message" on "message_part"."message_id" = "chat_message"."id" left join "chat" on "chat"."id" = "chat_message"."chat_id" left join "user" on "user"."id" = "chat"."user_id" where ("chat"."project_id" in (select "project_id" from "_scope") and ((
		select source_message.source
		from "chat_message" as source_message
		where source_message.chat_id = "chat"."id"
			and source_message.role = 'user'
			and source_message.superseded_at is null
		order by source_message.created_at asc
		limit 1
	) is null or (
		select source_message.source
		from "chat_message" as source_message
		where source_message.chat_id = "chat"."id"
			and source_message.role = 'user'
			and source_message.superseded_at is null
		order by source_message.created_at asc
		limit 1
	) <> 'admin')) order by "chat_message"."chat_id", "message_part"."created_at" asc`,
		columns: [
			'chat_id',
			'message_id',
			'user_id',
			'user_name',
			'title',
			'role',
			'type',
			'text',
			'stop_reason',
			'error_message',
			'llm_provider',
			'llm_model_id',
			'input_total_tokens',
			'input_no_cache_tokens',
			'input_cache_read_tokens',
			'input_cache_write_tokens',
			'output_total_tokens',
			'output_text_tokens',
			'output_reasoning_tokens',
			'total_tokens',
			'superseded_at',
			'message_source',
			'chat_source',
			'tool_name',
			'tool_call_id',
			'tool_state',
			'tool_error_text',
			'tool_input',
			'tool_output',
			'vote',
			'explanation',
			'created_at',
		],
	},
	{
		name: 'v_memories',
		body: `select "id", "user_id", "content", "category", "chat_id", "superseded_by", "created_at" as "created_at" from "memories" where "memories"."chat_id" in (select "id" from "chat" where "chat"."project_id" in (select "project_id" from "_scope"))`,
		columns: ['id', 'user_id', 'content', 'category', 'chat_id', 'superseded_by', 'created_at'],
	},
	{
		name: 'v_llm_inference',
		body: `select "id", "type", "total_tokens", "created_at" as "created_at" from "llm_inference" where "llm_inference"."project_id" in (select "project_id" from "_scope")`,
		columns: ['id', 'type', 'total_tokens', 'created_at'],
	},
	{
		name: 'v_mcp_call_log',
		body: `select "id", "tool_name", "duration_ms", "success", "called_at" as "called_at" from "mcp_call_log" where "mcp_call_log"."project_id" in (select "project_id" from "_scope")`,
		columns: ['id', 'tool_name', 'duration_ms', 'success', 'called_at'],
	},
	{
		name: 'v_project',
		body: `select "id", "name" from "project" where "project"."id" in (select "project_id" from "_scope")`,
		columns: ['id', 'name'],
	},
	{
		name: 'v_analytics_event',
		body: `select "analytics_event"."id", "analytics_event"."type", "analytics_event"."asset_type", "analytics_event"."actor_user_id", "user"."name" as "actor_user_name", "analytics_event"."chat_id", "analytics_event"."story_id", "analytics_event"."shared_chat_id", "analytics_event"."shared_story_id", "analytics_event"."metadata", "analytics_event"."created_at" as "created_at" from "analytics_event" left join "user" on "user"."id" = "analytics_event"."actor_user_id" where "analytics_event"."project_id" in (select "project_id" from "_scope")`,
		columns: [
			'id',
			'type',
			'asset_type',
			'actor_user_id',
			'actor_user_name',
			'chat_id',
			'story_id',
			'shared_chat_id',
			'shared_story_id',
			'metadata',
			'created_at',
		],
	},
	{
		name: 'v_story_feedback',
		body: `select "story_feedback"."story_id", "story"."title" as "story_title", coalesce("chat"."user_id", "story"."user_id") as "story_owner_id", "story_owner"."name" as "story_owner_name", "story_feedback"."user_id", "user"."name" as "user_name", "story_feedback"."vote", "story_feedback"."explanation", "story_feedback"."created_at" as "created_at", "story_feedback"."updated_at" as "updated_at" from "story_feedback" inner join "story" on "story"."id" = "story_feedback"."story_id" left join "chat" on "chat"."id" = "story"."chat_id" left join "user" on "user"."id" = "story_feedback"."user_id" left join "user" "story_owner" on "story_owner"."id" = coalesce("chat"."user_id", "story"."user_id") where ("story"."project_id" in (select "project_id" from "_scope") or "chat"."project_id" in (select "project_id" from "_scope"))`,
		columns: [
			'story_id',
			'story_title',
			'story_owner_id',
			'story_owner_name',
			'user_id',
			'user_name',
			'vote',
			'explanation',
			'created_at',
			'updated_at',
		],
	},
];

export function getScopedViews(): ScopedView[] {
	return SCOPED_VIEWS.map((view) => ({ ...view, columns: [...view.columns] }));
}

/** View name -> exposed columns. Safe to use in prompts and allowlists. */
export const APP_DB_VIEW_COLUMNS: Record<string, string[]> = Object.fromEntries(
	getScopedViews().map((view) => [view.name, view.columns]),
);
