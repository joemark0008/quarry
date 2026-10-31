import { QUERY_TOOL_PARAMETER_TYPES } from '@quarry/shared/query-tools';
import { skipToken, useQuery } from '@tanstack/react-query';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { QueryToolParameterType } from '@quarry/shared/query-tools';
import type {
	Aggregate,
	BuilderColumn,
	BuilderFilter,
	BuilderLimit,
	BuilderOrder,
	FilterOperator,
	GeneratedQuery,
} from '@/lib/query-builder';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/ui/error-message';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { projectApi } from '@/lib/project-api';
import {
	AGGREGATES,
	FILTER_OPERATOR_LABELS,
	FILTER_OPERATORS,
	generateQuerySql,
	outputName,
} from '@/lib/query-builder';
import { queryToolApi } from '@/lib/query-tool-api';
import styles from './query-builder-panel.module.css';

type DatabaseObject = { type: string; database: string; schema: string; table: string; fqdn: string };

const AGGREGATE_LABELS: Record<Aggregate, string> = {
	none: 'value',
	count: 'count',
	count_distinct: 'count distinct',
	sum: 'sum',
	avg: 'average',
	min: 'min',
	max: 'max',
};

/**
 * Builds a SELECT on one synced warehouse table: columns (optionally aggregated), filters with fixed values or
 * parameters, order and limit. "Generate SQL" hands the SQL and its parameters to the editor.
 */
export function QueryBuilderPanel({ onGenerate }: { onGenerate: (query: GeneratedQuery) => void }) {
	const objects = useQuery(projectApi.project.getDatabaseObjects.queryOptions());
	const [tableFqdn, setTableFqdn] = useState('');
	const [columns, setColumns] = useState<BuilderColumn[]>([]);
	const [filters, setFilters] = useState<BuilderFilter[]>([]);
	const [orderBy, setOrderBy] = useState<BuilderOrder[]>([]);
	const [limit, setLimit] = useState<BuilderLimit>({ kind: 'value', value: 100 });
	const [error, setError] = useState<string | null>(null);

	const table = objects.data?.find((object) => object.fqdn === tableFqdn) as DatabaseObject | undefined;
	const tableColumns = useQuery(
		queryToolApi.queryTool.tableColumns.queryOptions(
			table
				? { type: table.type, database: table.database, schema: table.schema, table: table.table }
				: skipToken,
		),
	);
	const columnNames = tableColumns.data?.map((column) => column.name) ?? [];
	const columnType = (name: string) => tableColumns.data?.find((column) => column.name === name)?.type ?? '';
	const outputs = useMemo(() => columns.map(outputName), [columns]);
	const groupBy = useMemo(
		() =>
			columns.some((column) => column.aggregate !== 'none')
				? columns.filter((column) => column.aggregate === 'none').map((column) => column.column)
				: [],
		[columns],
	);

	const selectTable = (fqdn: string) => {
		setTableFqdn(fqdn);
		setColumns([]);
		setFilters([]);
		setOrderBy([]);
		setError(null);
	};

	const generate = () => {
		if (!table) {
			setError('Pick a table.');
			return;
		}
		try {
			onGenerate(
				generateQuerySql({ schema: table.schema, table: table.table, columns, filters, orderBy, limit }),
			);
			setError(null);
		} catch (generateError) {
			setError((generateError as Error).message);
		}
	};

	return (
		<div className={styles.queryBuilderPanelDiv} data-testid='query-builder'>
			<Section label='Table'>
				<Select value={tableFqdn} onValueChange={selectTable}>
					<SelectTrigger className={styles.queryBuilderPanelSelectTrigger} aria-label='Table'>
						<SelectValue placeholder={objects.isLoading ? 'Loading tables…' : 'Pick a synced table'} />
					</SelectTrigger>
					<SelectContent>
						{(objects.data ?? []).map((object) => (
							<SelectItem key={object.fqdn} value={object.fqdn}>
								{object.schema}.{object.table}
								<span className={styles.queryBuilderPanelSpan}> · {object.database}</span>
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{objects.data?.length === 0 && (
					<p className={styles.queryBuilderPanelP}>
						No synced tables. Connect a warehouse and press Sync in Settings → Warehouse.
					</p>
				)}
			</Section>

			{table && (
				<>
					<Section label='Columns' hint='Leave empty to select every column.'>
						{columns.map((column, index) => (
							<Row key={index} onRemove={() => setColumns(columns.filter((_, i) => i !== index))}>
								<Select
									value={column.aggregate}
									onValueChange={(aggregate) =>
										setColumns(
											replaceAt(columns, index, { ...column, aggregate: aggregate as Aggregate }),
										)
									}
								>
									<SelectTrigger className={styles.queryBuilderPanelSelectTrigger2} aria-label='Aggregate'>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{AGGREGATES.map((aggregate) => (
											<SelectItem key={aggregate} value={aggregate}>
												{AGGREGATE_LABELS[aggregate]}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<ColumnSelect
									value={column.column}
									columns={column.aggregate === 'count' ? ['*', ...columnNames] : columnNames}
									onChange={(name) =>
										setColumns(replaceAt(columns, index, { ...column, column: name }))
									}
								/>
								<Input
									value={column.alias ?? ''}
									onChange={(event) =>
										setColumns(replaceAt(columns, index, { ...column, alias: event.target.value }))
									}
									placeholder={outputName({ ...column, alias: undefined }) || 'alias'}
									className={styles.queryBuilderPanelInput}
									aria-label='Alias'
								/>
							</Row>
						))}
						<AddButton
							label='Add column'
							onClick={() =>
								setColumns([...columns, { column: columnNames[0] ?? '', aggregate: 'none' }])
							}
						/>
					</Section>

					<Section label='Filters'>
						{filters.map((filter, index) => (
							<FilterRow
								key={index}
								filter={filter}
								columns={columnNames}
								columnType={columnType}
								onChange={(next) => setFilters(replaceAt(filters, index, next))}
								onRemove={() => setFilters(filters.filter((_, i) => i !== index))}
							/>
						))}
						<AddButton
							label='Add filter'
							onClick={() =>
								setFilters([
									...filters,
									{
										column: columnNames[0] ?? '',
										operator: '=',
										value: { kind: 'value', value: '' },
									},
								])
							}
						/>
					</Section>

					<Section label='Group by'>
						<p className={styles.queryBuilderPanelP}>
							{groupBy.length > 0
								? `Grouped by ${groupBy.join(', ')} (the columns that are not aggregated).`
								: 'Aggregate a column (count, sum…) to group by the other selected columns.'}
						</p>
					</Section>

					<Section label='Order by'>
						{orderBy.map((order, index) => (
							<Row key={index} onRemove={() => setOrderBy(orderBy.filter((_, i) => i !== index))}>
								<ColumnSelect
									value={order.column}
									columns={outputs.length > 0 ? outputs : columnNames}
									onChange={(name) =>
										setOrderBy(replaceAt(orderBy, index, { ...order, column: name }))
									}
								/>
								<Select
									value={order.direction}
									onValueChange={(direction) =>
										setOrderBy(
											replaceAt(orderBy, index, {
												...order,
												direction: direction as 'asc' | 'desc',
											}),
										)
									}
								>
									<SelectTrigger className={styles.queryBuilderPanelSelectTrigger3} aria-label='Direction'>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='asc'>ascending</SelectItem>
										<SelectItem value='desc'>descending</SelectItem>
									</SelectContent>
								</Select>
							</Row>
						))}
						<AddButton
							label='Add order'
							onClick={() =>
								setOrderBy([
									...orderBy,
									{ column: outputs[0] ?? columnNames[0] ?? '', direction: 'desc' },
								])
							}
						/>
					</Section>

					<Section label='Limit'>
						<div className={styles.queryBuilderPanelDiv2}>
							<Select
								value={limit.kind}
								onValueChange={(kind) =>
									setLimit(
										kind === 'none'
											? { kind: 'none' }
											: kind === 'value'
												? { kind: 'value', value: 100 }
												: { kind: 'parameter', name: 'max_rows', default: 100 },
									)
								}
							>
								<SelectTrigger className={styles.queryBuilderPanelSelectTrigger4} aria-label='Limit'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='none'>no limit</SelectItem>
									<SelectItem value='value'>fixed</SelectItem>
									<SelectItem value='parameter'>parameter</SelectItem>
								</SelectContent>
							</Select>
							{limit.kind === 'value' && (
								<Input
									type='number'
									min={0}
									value={limit.value}
									onChange={(event) => setLimit({ kind: 'value', value: Number(event.target.value) })}
									className={styles.queryBuilderPanelInput2}
									aria-label='Row limit'
								/>
							)}
							{limit.kind === 'parameter' && (
								<>
									<Input
										value={limit.name}
										onChange={(event) => setLimit({ ...limit, name: event.target.value })}
										className={styles.queryBuilderPanelInput3}
										aria-label='Limit parameter name'
									/>
									<span className={styles.queryBuilderPanelP}>default</span>
									<Input
										type='number'
										min={0}
										value={limit.default}
										onChange={(event) =>
											setLimit({ ...limit, default: Number(event.target.value) })
										}
										className={styles.queryBuilderPanelInput4}
										aria-label='Limit default'
									/>
								</>
							)}
						</div>
					</Section>
				</>
			)}

			{error && <ErrorMessage message={error} />}
			<div>
				<Button size='sm' onClick={generate} disabled={!table}>
					<Wand2 />
					Generate SQL
				</Button>
			</div>
		</div>
	);
}

function FilterRow({
	filter,
	columns,
	columnType,
	onChange,
	onRemove,
}: {
	filter: BuilderFilter;
	columns: string[];
	columnType: (name: string) => string;
	onChange: (filter: BuilderFilter) => void;
	onRemove: () => void;
}) {
	const takesValue = filter.operator !== 'is_null' && filter.operator !== 'is_not_null';
	return (
		<Row onRemove={onRemove}>
			<ColumnSelect
				value={filter.column}
				columns={columns}
				onChange={(column) => onChange({ ...filter, column })}
			/>
			<Select
				value={filter.operator}
				onValueChange={(operator) => onChange({ ...filter, operator: operator as FilterOperator })}
			>
				<SelectTrigger className={styles.queryBuilderPanelSelectTrigger4} aria-label='Operator'>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{FILTER_OPERATORS.map((operator) => (
						<SelectItem key={operator} value={operator}>
							{FILTER_OPERATOR_LABELS[operator]}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{takesValue && (
				<Select
					value={filter.value.kind}
					onValueChange={(kind) =>
						onChange({
							...filter,
							value:
								kind === 'value'
									? { kind: 'value', value: '' }
									: {
											kind: 'parameter',
											name: filter.column,
											type: parameterTypeFor(columnType(filter.column)),
											required: true,
										},
						})
					}
				>
					<SelectTrigger className={styles.queryBuilderPanelSelectTrigger3} aria-label='Value kind'>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value='value'>fixed value</SelectItem>
						<SelectItem value='parameter'>parameter</SelectItem>
					</SelectContent>
				</Select>
			)}
			{takesValue && filter.value.kind === 'value' && (
				<Input
					value={filter.value.value}
					onChange={(event) => onChange({ ...filter, value: { kind: 'value', value: event.target.value } })}
					placeholder={filter.operator === 'in' ? 'a, b, c' : 'value'}
					className={styles.queryBuilderPanelSelectTrigger4}
					aria-label='Filter value'
				/>
			)}
			{takesValue && filter.value.kind === 'parameter' && (
				<>
					<Input
						value={filter.value.name}
						onChange={(event) =>
							filter.value.kind === 'parameter' &&
							onChange({ ...filter, value: { ...filter.value, name: event.target.value } })
						}
						className={styles.queryBuilderPanelInput3}
						aria-label='Parameter name'
					/>
					<Select
						value={filter.value.type}
						onValueChange={(type) =>
							filter.value.kind === 'parameter' &&
							onChange({ ...filter, value: { ...filter.value, type: type as QueryToolParameterType } })
						}
					>
						<SelectTrigger className={styles.queryBuilderPanelInput2} aria-label='Parameter type'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{QUERY_TOOL_PARAMETER_TYPES.map((type) => (
								<SelectItem key={type} value={type}>
									{type}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</>
			)}
		</Row>
	);
}

function ColumnSelect({
	value,
	columns,
	onChange,
}: {
	value: string;
	columns: string[];
	onChange: (column: string) => void;
}) {
	return (
		<Select value={value} onValueChange={onChange}>
			<SelectTrigger className={styles.columnSelectSelectTrigger} aria-label='Column'>
				<SelectValue placeholder='column' />
			</SelectTrigger>
			<SelectContent>
				{columns.map((column) => (
					<SelectItem key={column} value={column} className={styles.columnSelectSelectItem}>
						{column}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function Section({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
	return (
		<div className={styles.sectionDiv}>
			<div className={styles.sectionDiv2}>
				<span className={styles.sectionSpan}>{label}</span>
				{hint && <span className={styles.queryBuilderPanelP}>{hint}</span>}
			</div>
			{children}
		</div>
	);
}

function Row({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
	return (
		<div className={styles.rowDiv}>
			{children}
			<Button variant='ghost-muted' size='icon-sm' onClick={onRemove} aria-label='Remove'>
				<Trash2 />
			</Button>
		</div>
	);
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
	return (
		<div>
			<Button variant='outline' size='sm' onClick={onClick}>
				<Plus />
				{label}
			</Button>
		</div>
	);
}

function replaceAt<T>(items: T[], index: number, item: T): T[] {
	return items.map((current, i) => (i === index ? item : current));
}

/** Parameter type for a column type recorded by the context sync (`int32`, `decimal(10, 2)`, `timestamp`…). */
export function parameterTypeFor(columnType: string): QueryToolParameterType {
	const type = columnType.toLowerCase();
	if (/^u?int/.test(type)) {
		return 'integer';
	}
	if (/^(float|double|decimal|numeric)/.test(type)) {
		return 'number';
	}
	if (type.startsWith('bool')) {
		return 'boolean';
	}
	if (type.startsWith('date') || type.startsWith('timestamp')) {
		return 'date';
	}
	return 'string';
}
