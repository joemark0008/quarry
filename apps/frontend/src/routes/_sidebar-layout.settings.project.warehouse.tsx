import { useMutation, useQuery } from '@apollo/client/react';
import { createFileRoute } from '@tanstack/react-router';
import { CheckCircle2, Database, RefreshCw, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import type { WarehouseConnectionsQuery } from '@/graphql/generated/graphql';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SettingsCard } from '@/components/ui/settings-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
	ConnectWarehouseDocument,
	ContextSyncStatusDocument,
	DisconnectWarehouseDocument,
	SyncContextDocument,
	TestWarehouseConnectionDocument,
	WarehouseConnectionsDocument,
} from '@/graphql/generated/graphql';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_sidebar-layout/settings/project/warehouse')({
	staticData: {
		title: 'Warehouse',
	},
	component: WarehouseSettingsPage,
});

type Connection = WarehouseConnectionsQuery['warehouseConnections'][number];

/**
 * quarry: connect the project to a PostgreSQL warehouse and sync its context (replaces `nao init` / editing
 * `nao_config.yaml` and running `nao sync`).
 */
function WarehouseSettingsPage() {
	const { isAdmin } = usePermissions();
	const connections = useQuery(WarehouseConnectionsDocument);
	const [editing, setEditing] = useState<Connection | 'new' | null>(null);
	const list = connections.data?.warehouseConnections ?? [];

	return (
		<>
			<SettingsCard
				title='Warehouse'
				description='The database the agent queries. Credentials are checked on a live connection and stored encrypted.'
				action={
					isAdmin && editing === null ? (
						<Button size='sm' variant='outline' onClick={() => setEditing('new')}>
							{list.length === 0 ? 'Connect a warehouse' : 'Add a connection'}
						</Button>
					) : null
				}
			>
				{connections.loading && !connections.data ? (
					<Skeleton className='h-10 w-full' />
				) : connections.error ? (
					<p className='text-sm text-destructive'>{connections.error.message}</p>
				) : list.length === 0 && editing === null ? (
					<p className='text-sm text-muted-foreground'>No warehouse is connected yet.</p>
				) : (
					<div className='flex flex-col divide-y'>
						{list.map((connection) =>
							editing !== 'new' && editing?.name === connection.name ? (
								<ConnectionForm
									key={connection.name}
									connection={connection}
									onDone={() => setEditing(null)}
								/>
							) : (
								<ConnectionRow
									key={connection.name}
									connection={connection}
									canEdit={isAdmin}
									onEdit={() => setEditing(connection)}
								/>
							),
						)}
					</div>
				)}
				{editing === 'new' && <ConnectionForm connection={null} onDone={() => setEditing(null)} />}
			</SettingsCard>

			<ContextSyncCard canSync={isAdmin && list.some((connection) => connection.supported)} />
		</>
	);
}

function ConnectionRow({
	connection,
	canEdit,
	onEdit,
}: {
	connection: Connection;
	canEdit: boolean;
	onEdit: () => void;
}) {
	const [testConnection, test] = useMutation(TestWarehouseConnectionDocument);
	const [disconnect, disconnectState] = useMutation(DisconnectWarehouseDocument, {
		refetchQueries: [WarehouseConnectionsDocument],
	});
	const result = test.data?.testWarehouseConnection;

	return (
		<div className='flex flex-col gap-2 py-3'>
			<div className='flex items-center gap-3'>
				<Database className='size-4 shrink-0 text-muted-foreground' />
				<div className='min-w-0 flex-1'>
					<div className='text-sm font-medium'>{connection.name}</div>
					<div className='truncate text-xs text-muted-foreground'>
						{connection.supported
							? `${connection.type} · ${connection.user}@${connection.host}:${connection.port}/${connection.database}${connection.schemaName ? ` · schema ${connection.schemaName}` : ''}`
							: `${connection.type} (not supported by quarry yet)`}
					</div>
				</div>
				{canEdit && connection.supported && (
					<div className='flex shrink-0 gap-2'>
						<Button
							size='sm'
							variant='ghost'
							disabled={test.loading}
							onClick={() => void testConnection({ variables: { name: connection.name } })}
						>
							{test.loading ? <Spinner className='size-3' /> : 'Test'}
						</Button>
						<Button size='sm' variant='ghost' onClick={onEdit}>
							Edit
						</Button>
						<Button
							size='sm'
							variant='ghost'
							className='text-destructive'
							disabled={disconnectState.loading}
							onClick={() => void disconnect({ variables: { name: connection.name } })}
						>
							Remove
						</Button>
					</div>
				)}
			</div>
			{result && (
				<p
					className={cn(
						'flex items-center gap-1.5 text-xs',
						result.success ? 'text-emerald-600' : 'text-destructive',
					)}
				>
					{result.success ? <CheckCircle2 className='size-3.5' /> : <XCircle className='size-3.5' />}
					{result.message}
				</p>
			)}
		</div>
	);
}

interface FormState {
	name: string;
	host: string;
	port: string;
	database: string;
	user: string;
	password: string;
	schemaName: string;
}

function ConnectionForm({ connection, onDone }: { connection: Connection | null; onDone: () => void }) {
	const [form, setForm] = useState<FormState>({
		name: connection?.name ?? 'warehouse',
		host: connection?.host ?? 'localhost',
		port: String(connection?.port ?? 5432),
		database: connection?.database ?? '',
		user: connection?.user ?? '',
		password: '',
		schemaName: connection?.schemaName ?? '',
	});
	const [connect, { loading, data, error }] = useMutation(ConnectWarehouseDocument, {
		refetchQueries: [WarehouseConnectionsDocument],
	});
	const result = data?.connectWarehouse;
	const invalidFields = new Set(result && !result.success ? result.fields : []);

	const update = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) =>
		setForm((current) => ({ ...current, [field]: event.target.value }));

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		const response = await connect({
			variables: {
				input: {
					name: form.name.trim(),
					host: form.host.trim(),
					port: Number(form.port),
					database: form.database.trim(),
					user: form.user.trim(),
					password: form.password || null,
					schemaName: form.schemaName.trim() || null,
				},
			},
		}).catch(() => null);
		if (response?.data?.connectWarehouse.success) {
			onDone();
		}
	};

	const field = (key: keyof FormState, label: string, props: React.ComponentProps<typeof Input> = {}) => {
		const apiField = { schemaName: 'schema_name' }[key as string] ?? key;
		return (
			<label className='flex flex-col gap-1 text-sm'>
				<span className='text-muted-foreground'>{label}</span>
				<Input
					value={form[key]}
					onChange={update(key)}
					aria-invalid={invalidFields.has(apiField) || undefined}
					className={cn(invalidFields.has(apiField) && 'border-destructive')}
					{...props}
				/>
			</label>
		);
	};

	return (
		<form onSubmit={handleSubmit} className='flex flex-col gap-3 py-3'>
			<div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
				{field('name', 'Connection name', { disabled: connection !== null, required: true })}
				{field('database', 'Database', { required: true, placeholder: 'analytics' })}
				{field('host', 'Host', { required: true })}
				{field('port', 'Port', { required: true, inputMode: 'numeric' })}
				{field('user', 'User', { required: true, autoComplete: 'off' })}
				{field('password', 'Password', {
					type: 'password',
					autoComplete: 'new-password',
					placeholder: connection?.hasPassword ? 'Unchanged' : '',
				})}
				{field('schemaName', 'Schema (optional)', { placeholder: 'All schemas' })}
			</div>
			<p className='text-xs text-muted-foreground'>
				PostgreSQL only for now. Queries run in read-only transactions.
			</p>
			{(error || (result && !result.success)) && (
				<p className='text-sm text-destructive'>{error?.message ?? result?.message}</p>
			)}
			<div className='flex justify-end gap-2'>
				<Button type='button' variant='ghost' onClick={onDone}>
					Cancel
				</Button>
				<Button type='submit' disabled={loading}>
					{loading ? 'Checking connection…' : connection ? 'Save' : 'Connect'}
				</Button>
			</div>
		</form>
	);
}

const ACTIVE_STATES = new Set(['queued', 'running']);

function ContextSyncCard({ canSync }: { canSync: boolean }) {
	const status = useQuery(ContextSyncStatusDocument, { notifyOnNetworkStatusChange: true });
	const [syncContext, sync] = useMutation(SyncContextDocument, {
		refetchQueries: [ContextSyncStatusDocument],
	});
	const current = status.data?.contextSyncStatus;
	const isActive = current ? ACTIVE_STATES.has(current.state) : false;

	useEffect(() => {
		if (!isActive) {
			return;
		}
		const timer = setInterval(() => void status.refetch(), 1500);
		return () => clearInterval(timer);
	}, [isActive, status]);

	return (
		<SettingsCard
			title='Context sync'
			description='Writes the schemas, columns and a preview of every table to the project context, which the agent reads before writing SQL.'
			action={
				canSync ? (
					<Button size='sm' disabled={isActive || sync.loading} onClick={() => void syncContext()}>
						<RefreshCw className={cn('size-3.5', isActive && 'animate-spin')} />
						{isActive ? 'Syncing…' : 'Sync'}
					</Button>
				) : null
			}
		>
			{!current ? (
				<Skeleton className='h-6 w-64' />
			) : current.state === 'idle' ? (
				<p className='text-sm text-muted-foreground'>Not synced yet.</p>
			) : (
				<div className='flex flex-col gap-2 text-sm'>
					<p className={cn(current.state === 'failed' && 'text-destructive')}>
						{describeState(current.state)}
						{current.message ? ` — ${current.message}` : ''}
					</p>
					{current.finishedAt && (
						<p className='text-xs text-muted-foreground'>
							Last run finished {new Date(current.finishedAt).toLocaleString()}
						</p>
					)}
					{current.databases.length > 0 && (
						<ul className='text-xs text-muted-foreground'>
							{current.databases.map((database) => (
								<li key={database.databaseName}>
									{database.databaseName}: {database.tablesSynced} tables in {database.schemasSynced}{' '}
									schema{database.schemasSynced === 1 ? '' : 's'}
									{database.renderErrors > 0 ? `, ${database.renderErrors} errors` : ''}
								</li>
							))}
						</ul>
					)}
					{current.state === 'failed' && current.log.length > 0 && (
						<pre className='max-h-40 overflow-auto rounded bg-muted p-2 text-xs'>
							{current.log.join('\n')}
						</pre>
					)}
				</div>
			)}
			{sync.error && <p className='text-sm text-destructive'>{sync.error.message}</p>}
		</SettingsCard>
	);
}

function describeState(state: string): string {
	switch (state) {
		case 'queued':
			return 'Waiting to start';
		case 'running':
			return 'Syncing';
		case 'succeeded':
			return 'Synced';
		case 'failed':
			return 'Sync failed';
		default:
			return state;
	}
}
