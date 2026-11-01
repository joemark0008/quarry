import { skipToken, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import styles from './query-workbench.module.css';
import type { DatabaseObject } from '@/lib/reference-mention-menu';

import { Empty } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { projectApi } from '@/lib/project-api';
import { queryToolApi } from '@/lib/query-tool-api';

/** The synced tables and their columns; clicking a name inserts it in the editor. */
export function WorkbenchSchema({ onInsert }: { onInsert: (text: string) => void }) {
	const objects = useQuery(projectApi.project.getDatabaseObjects.queryOptions());
	const [filter, setFilter] = useState('');
	const search = filter.trim().toLowerCase();
	const tables = objects.data?.filter((object) => object.fqdn.toLowerCase().includes(search)) ?? [];

	if (objects.isLoading) {
		return <Skeleton className={styles.schemaSkeleton} />;
	}
	if (!objects.data?.length) {
		return (
			<Empty>
				No tables synced yet. <Link to='/settings/project/warehouse'>Sync the warehouse</Link> to list them
				here.
			</Empty>
		);
	}
	return (
		<div className={styles.schema} data-testid='workbench-schema'>
			<Input
				value={filter}
				onChange={(event) => setFilter(event.target.value)}
				placeholder='Filter tables'
				aria-label='Filter tables'
			/>
			<ul className={styles.schemaList}>
				{tables.map((table) => (
					<SchemaTable key={table.fqdn} table={table} onInsert={onInsert} />
				))}
			</ul>
		</div>
	);
}

function SchemaTable({ table, onInsert }: { table: DatabaseObject; onInsert: (text: string) => void }) {
	const [isOpen, setIsOpen] = useState(false);
	const columns = useQuery(
		queryToolApi.queryTool.tableColumns.queryOptions(
			isOpen
				? { type: table.type, database: table.database, schema: table.schema, table: table.table }
				: skipToken,
		),
	);
	const Chevron = isOpen ? ChevronDown : ChevronRight;

	return (
		<li>
			<div className={styles.schemaRow}>
				<button
					type='button'
					className={styles.schemaToggle}
					onClick={() => setIsOpen(!isOpen)}
					aria-label={`${isOpen ? 'Hide' : 'Show'} columns of ${table.table}`}
				>
					<Chevron />
				</button>
				<button
					type='button'
					className={styles.schemaName}
					title={`Insert ${table.schema}.${table.table}`}
					onClick={() => onInsert(`${table.schema}.${table.table}`)}
				>
					{table.schema}.{table.table}
				</button>
			</div>
			{isOpen && (
				<ul className={styles.schemaColumns}>
					{columns.data?.map((column) => (
						<li key={column.name} className={styles.schemaRow}>
							<button
								type='button'
								className={styles.schemaName}
								title={`Insert ${column.name}`}
								onClick={() => onInsert(column.name)}
							>
								{column.name}
							</button>
							<span className={styles.mutedText}>{column.type}</span>
						</li>
					))}
				</ul>
			)}
		</li>
	);
}
