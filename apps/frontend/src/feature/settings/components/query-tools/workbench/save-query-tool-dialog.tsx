import { QUERY_TOOL_NAME_MAX_LENGTH, QUERY_TOOL_NAME_PATTERN } from '@quarry/shared/query-tools';
import { useState } from 'react';
import styles from './save-query-tool-dialog.module.css';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorMessage } from '@/components/ui/error-message';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export interface QueryToolDetails {
	name: string;
	description: string;
	enabled: boolean;
}

/** The details a query needs to become a tool, asked for only once the query is worth saving. */
export function SaveQueryToolDialog({
	title,
	initial,
	submitLabel,
	isPending,
	error,
	onClose,
	onSubmit,
}: {
	title: string;
	initial: QueryToolDetails;
	submitLabel: string;
	isPending: boolean;
	error?: string;
	onClose: () => void;
	onSubmit: (details: QueryToolDetails) => void;
}) {
	const [details, setDetails] = useState(initial);
	const { name, description, enabled } = details;
	const nameError =
		name && (!QUERY_TOOL_NAME_PATTERN.test(name) || name.length < 3 || name.length > QUERY_TOOL_NAME_MAX_LENGTH)
			? `Use snake_case, 3 to ${QUERY_TOOL_NAME_MAX_LENGTH} characters, starting with a letter.`
			: null;

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>
				<DialogDescription>
					The agent sees the name, the description and the parameters, and calls the tool when a question
					matches them.
				</DialogDescription>
				<form
					className={styles.saveDialogForm}
					onSubmit={(event) => {
						event.preventDefault();
						onSubmit(details);
					}}
				>
					<label className={styles.saveDialogField}>
						<span className={styles.saveDialogLabel}>Name</span>
						<Input
							value={name}
							onChange={(event) => setDetails({ ...details, name: event.target.value })}
							placeholder='orders_by_status'
							className={styles.saveDialogName}
							aria-invalid={Boolean(nameError)}
							autoFocus
						/>
						<span className={styles.saveDialogHint}>
							{nameError ?? `The agent calls it as qt_${name || '<name>'}.`}
						</span>
					</label>
					<label className={styles.saveDialogField}>
						<span className={styles.saveDialogLabel}>Description</span>
						<Textarea
							value={description}
							onChange={(event) => setDetails({ ...details, description: event.target.value })}
							placeholder='What the query returns and when to use it.'
							rows={3}
						/>
					</label>
					<label className={styles.saveDialogSwitch}>
						<Switch
							checked={enabled}
							onCheckedChange={(checked) => setDetails({ ...details, enabled: checked })}
							aria-label='Available to the agent'
						/>
						<span>Available to the agent</span>
					</label>
					{error && <ErrorMessage message={error} />}
					<div className={styles.saveDialogActions}>
						<Button type='button' variant='ghost-muted' size='sm' onClick={onClose}>
							Cancel
						</Button>
						<Button
							type='submit'
							size='sm'
							disabled={!name || !description.trim() || Boolean(nameError) || isPending}
						>
							{submitLabel}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
