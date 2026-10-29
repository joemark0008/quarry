import { useQuery as useApolloQuery } from '@apollo/client/react';
import {
	extractQueryToolPlaceholders,
	QUERY_TOOL_NAME_MAX_LENGTH,
	QUERY_TOOL_NAME_PATTERN,
} from '@quarry/shared/query-tools';
import { Code, Play, Save, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { QueryBuilderPanel } from './query-builder-panel';
import { QueryToolParameters } from './query-tool-parameters';
import { QueryToolSqlEditor } from './query-tool-sql-editor';
import type { GeneratedQuery } from '@/lib/query-builder';
import type { QueryToolParameter } from '@quarry/shared/query-tools';
import type { ProjectQueryTool, QueryToolPreview } from '@/lib/api-types';
import { TableDisplay } from '@/components/tool-calls/display-table';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/ui/error-message';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingsCard } from '@/components/ui/settings-card';
import { Switch } from '@/components/ui/switch';
import { TabBar } from '@/components/ui/tab-bar';
import { Textarea } from '@/components/ui/textarea';
import { WarehouseConnectionsDocument } from '@/graphql/generated/graphql';
import { useQueryToolMutations } from '@/queries/use-query-tools';

type EditorTab = 'sql' | 'builder';

const DEFAULT_CONNECTION = '__default__';

/** Create or edit a saved query tool: SQL (typed or built), parameters, a preview run, then save. */
export function QueryToolEditor({
	tool,
	initialSql,
	onDone,
}: {
	tool?: ProjectQueryTool;
	/** SQL to start a new tool from (Save as tool in chat). */
	initialSql?: string;
	onDone: () => void;
}) {
	const { createMutation, updateMutation, previewMutation } = useQueryToolMutations();
	const connections = useApolloQuery(WarehouseConnectionsDocument);
	const [tab, setTab] = useState<EditorTab>(tool || initialSql ? 'sql' : 'builder');
	const [name, setName] = useState(tool?.name ?? '');
	const [description, setDescription] = useState(tool?.description ?? '');
	const [sql, setSql] = useState(tool?.sqlTemplate ?? initialSql ?? '');
	const [parameters, setParameters] = useState<QueryToolParameter[]>(tool?.parameters ?? []);
	const [values, setValues] = useState<Record<string, string>>({});
	const [databaseId, setDatabaseId] = useState<string | null>(tool?.databaseId ?? null);
	const [enabled, setEnabled] = useState(tool?.enabled ?? true);
	const [preview, setPreview] = useState<QueryToolPreview | null>(null);

	const placeholders = useMemo(() => extractQueryToolPlaceholders(sql), [sql]);
	const nameError =
		name && (!QUERY_TOOL_NAME_PATTERN.test(name) || name.length < 3 || name.length > QUERY_TOOL_NAME_MAX_LENGTH)
			? `Use snake_case, 3 to ${QUERY_TOOL_NAME_MAX_LENGTH} characters, starting with a letter.`
			: null;
	const saveMutation = tool ? updateMutation : createMutation;
	const connectionNames = connections.data?.warehouseConnections.map((connection) => connection.name) ?? [];

	const applyGenerated = (generated: GeneratedQuery) => {
		setSql(generated.sql);
		setParameters((current) =>
			generated.parameters.map(
				(parameter) => current.find((existing) => existing.name === parameter.name) ?? parameter,
			),
		);
		setPreview(null);
		setTab('sql');
	};

	const runPreview = () => {
		previewMutation.mutate(
			{
				sqlTemplate: sql,
				parameters,
				values: Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '')),
				databaseId,
			},
			{ onSuccess: setPreview },
		);
	};

	const save = async () => {
		const draft = { name, description, sqlTemplate: sql, parameters, databaseId, enabled };
		if (tool) {
			await updateMutation.mutateAsync({ id: tool.id, ...draft });
		} else {
			await createMutation.mutateAsync(draft);
		}
		onDone();
	};

	return (
		<SettingsCard
			title={tool ? `Edit ${tool.name}` : 'New query tool'}
			description='The agent sees the name, the description and the parameters, and calls the tool when a question matches it.'
			divide
		>
			<div className='flex flex-col gap-4'>
				<div className='grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]'>
					<label className='flex flex-col gap-1.5'>
						<span className='text-xs font-medium'>Name</span>
						<Input
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder='orders_by_status'
							className='font-mono'
							aria-invalid={Boolean(nameError)}
						/>
						<span className='text-xs text-muted-foreground'>
							{nameError ?? `The agent calls it as qt_${name || '<name>'}.`}
						</span>
					</label>
					<label className='flex flex-col gap-1.5'>
						<span className='text-xs font-medium'>Description</span>
						<Textarea
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							placeholder='What the query returns and when to use it, e.g. "Order count and revenue for one order status."'
							rows={3}
						/>
					</label>
				</div>

				<div className='flex flex-wrap items-center gap-4'>
					{connectionNames.length > 1 && (
						<label className='flex items-center gap-2 text-xs'>
							<span className='font-medium'>Warehouse</span>
							<Select
								value={databaseId ?? DEFAULT_CONNECTION}
								onValueChange={(value) => setDatabaseId(value === DEFAULT_CONNECTION ? null : value)}
							>
								<SelectTrigger className='h-8 w-48 text-xs'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={DEFAULT_CONNECTION}>Default connection</SelectItem>
									{connectionNames.map((connection) => (
										<SelectItem key={connection} value={connection}>
											{connection}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</label>
					)}
					<label className='flex items-center gap-2 text-xs'>
						<Switch checked={enabled} onCheckedChange={setEnabled} aria-label='Enabled' />
						<span>Available to the agent</span>
					</label>
				</div>

				<TabBar<EditorTab>
					idBase='query-tool-editor'
					activeTab={tab}
					onTabChange={setTab}
					tabs={[
						{ id: 'builder', label: 'Builder', icon: <Wand2 className='size-3.5' /> },
						{ id: 'sql', label: 'SQL', icon: <Code className='size-3.5' /> },
					]}
				/>
				{tab === 'builder' ? (
					<QueryBuilderPanel onGenerate={applyGenerated} />
				) : (
					<QueryToolSqlEditor value={sql} onChange={setSql} onRun={runPreview} />
				)}

				<div className='flex flex-col gap-2'>
					<span className='text-xs font-medium'>Parameters</span>
					<QueryToolParameters
						parameters={parameters}
						values={values}
						onChange={setParameters}
						onValuesChange={setValues}
						placeholders={placeholders}
					/>
				</div>

				<div className='flex flex-wrap items-center gap-2'>
					<Button
						variant='outline'
						size='sm'
						onClick={runPreview}
						disabled={!sql.trim() || previewMutation.isPending}
					>
						<Play />
						Preview
					</Button>
					<Button
						size='sm'
						onClick={() => save().catch(() => undefined)}
						disabled={
							!name || !description.trim() || !sql.trim() || Boolean(nameError) || saveMutation.isPending
						}
					>
						<Save />
						{tool ? 'Save changes' : 'Save tool'}
					</Button>
					<Button variant='ghost-muted' size='sm' onClick={onDone}>
						Cancel
					</Button>
				</div>

				{previewMutation.error && <ErrorMessage message={previewMutation.error.message} />}
				{saveMutation.error && <ErrorMessage message={saveMutation.error.message} />}
				{preview && (
					<div className='flex flex-col gap-2' data-testid='query-tool-preview'>
						<span className='text-xs text-muted-foreground'>
							{preview.rowCount} {preview.rowCount === 1 ? 'row' : 'rows'}
							{preview.truncated ? ' (first rows only)' : ''}
						</span>
						<TableDisplay
							data={preview.rows}
							columns={preview.columns}
							tableContainerClassName='max-h-80'
							emptyLabel='No rows returned'
							maxRowsBeforePagination={50}
						/>
					</div>
				)}
			</div>
		</SettingsCard>
	);
}
