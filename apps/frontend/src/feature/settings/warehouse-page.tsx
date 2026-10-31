import { useMutation, useQuery } from '@apollo/client/react';
import { CheckCircle2, Database, RefreshCw, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { WarehouseConnectionsQuery } from '@/graphql/generated/graphql';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SettingsCard } from '@/components/ui/settings-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { ConnectWarehouseDocument, ContextSyncStatusDocument, DisconnectWarehouseDocument, SyncContextDocument, TestWarehouseConnectionDocument, WarehouseConnectionsDocument } from '@/graphql/generated/graphql';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';
import styles from './warehouse-page.module.css';


type Connection = WarehouseConnectionsQuery['warehouseConnections'][number];

/**
 * quarry: connect the project to a PostgreSQL warehouse and sync its context (replaces `nao init` / editing
 * `quarry_config.yaml` and running `nao sync`).
 */
export function WarehouseSettingsPage() {
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
					<Skeleton className={styles.warehouseSettingsPageSkeleton} />
				) : connections.error ? (
					<p className={styles.warehouseSettingsPageP}>{connections.error.message}</p>
				) : list.length === 0 && editing === null ? (
					<p className={styles.warehouseSettingsPageP2}>No warehouse is connected yet.</p>
				) : (
					<div className={styles.warehouseSettingsPageDiv}>
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
		<div className={styles.connectionRowDiv}>
			<div className={styles.connectionRowDiv2}>
				<Database className={styles.connectionRowDatabase} />
				<div className={styles.connectionRowDiv3}>
					<div className={styles.connectionRowDiv4}>{connection.name}</div>
					<div className={styles.connectionRowDiv5}>
						{connection.supported
							? `${connection.type} · ${connection.user}@${connection.host}:${connection.port}/${connection.database}${connection.schemaName ? ` · schema ${connection.schemaName}` : ''}`
							: `${connection.type} (not supported by quarry yet)`}
					</div>
				</div>
				{canEdit && connection.supported && (
					<div className={styles.connectionRowDiv6}>
						<Button
							size='sm'
							variant='ghost'
							disabled={test.loading}
							onClick={() => void testConnection({ variables: { name: connection.name } })}
						>
							{test.loading ? <Spinner className={styles.connectionRowSpinner} /> : 'Test'}
						</Button>
						<Button size='sm' variant='ghost' onClick={onEdit}>
							Edit
						</Button>
						<Button
							size='sm'
							variant='ghost'
							className={styles.connectionRowButton}
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
						styles.connectionRowP,
						result.success ? styles.connectionRowP2 : styles.connectionRowButton,
					)}
				>
					{result.success ? <CheckCircle2 className={styles.connectionRowCheckCircle2} /> : <XCircle className={styles.connectionRowCheckCircle2} />}
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
			<label className={styles.fieldLabel}>
				<span className={styles.fieldSpan}>{label}</span>
				<Input
					value={form[key]}
					onChange={update(key)}
					aria-invalid={invalidFields.has(apiField) || undefined}
					className={cn(invalidFields.has(apiField) && styles.fieldInput)}
					{...props}
				/>
			</label>
		);
	};

	return (
		<form onSubmit={handleSubmit} className={styles.connectionFormForm}>
			<div className={styles.connectionFormDiv}>
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
			<p className={styles.connectionFormP}>
				PostgreSQL only for now. Queries run in read-only transactions.
			</p>
			{(error || (result && !result.success)) && (
				<p className={styles.warehouseSettingsPageP}>{error?.message ?? result?.message}</p>
			)}
			<div className={styles.connectionFormDiv2}>
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
						<RefreshCw className={cn(styles.connectionRowCheckCircle2, isActive && styles.contextSyncCardRefreshCw)} />
						{isActive ? 'Syncing…' : 'Sync'}
					</Button>
				) : null
			}
		>
			{!current ? (
				<Skeleton className={styles.contextSyncCardSkeleton} />
			) : current.state === 'idle' ? (
				<p className={styles.warehouseSettingsPageP2}>Not synced yet.</p>
			) : (
				<div className={styles.contextSyncCardDiv}>
					<p className={cn(current.state === 'failed' && styles.connectionRowButton)}>
						{describeState(current.state)}
						{current.message ? ` — ${current.message}` : ''}
					</p>
					{current.finishedAt && (
						<p className={styles.connectionFormP}>
							Last run finished {new Date(current.finishedAt).toLocaleString()}
						</p>
					)}
					{current.databases.length > 0 && (
						<ul className={styles.connectionFormP}>
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
						<pre className={styles.contextSyncCardPre}>
							{current.log.join('\n')}
						</pre>
					)}
				</div>
			)}
			{sync.error && <p className={styles.warehouseSettingsPageP}>{sync.error.message}</p>}
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
