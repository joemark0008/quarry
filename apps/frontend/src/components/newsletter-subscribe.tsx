import { useEffect, useId, useState } from 'react';

import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { QUARRY_NEWSLETTER_SUBSCRIBE_URL } from '@/lib/quarry-links';

interface NewsletterSubscribeDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

interface NewsletterSubscribeInlineFormProps {
	initialEmail?: string;
}

interface NewsletterSubscribeFormProps {
	initialEmail?: string;
	variant?: 'dialog' | 'inline';
}

export function NewsletterSubscribeDialog({ open, onOpenChange }: NewsletterSubscribeDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Subscribe to the quarry newsletter</DialogTitle>
					<DialogDescription>
						Get product updates, release notes, and practical analytics agent tips in your inbox.
					</DialogDescription>
				</DialogHeader>
				<NewsletterSubscribeForm />
			</DialogContent>
		</Dialog>
	);
}

export function NewsletterSubscribeInlineForm({ initialEmail }: NewsletterSubscribeInlineFormProps) {
	return <NewsletterSubscribeForm initialEmail={initialEmail} variant='inline' />;
}

function NewsletterSubscribeForm({ initialEmail = '', variant = 'dialog' }: NewsletterSubscribeFormProps) {
	const inputId = useId();
	const isInline = variant === 'inline';
	const [email, setEmail] = useState(initialEmail);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [hasError, setHasError] = useState(false);

	useEffect(() => {
		setEmail(initialEmail);
	}, [initialEmail]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsSubmitting(true);
		setMessage(null);
		setHasError(false);

		try {
			await subscribeToNewsletter(email);
			setMessage("You're subscribed. Thanks for following quarry.");
		} catch (error) {
			setHasError(true);
			setMessage(error instanceof Error ? error.message : 'Could not subscribe right now.');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className={cn('flex flex-col gap-2', isInline && 'items-end gap-1')}>
			<form
				className={cn('flex gap-2', isInline ? 'items-center' : 'flex-col sm:flex-row')}
				onSubmit={handleSubmit}
			>
				<label htmlFor={inputId} className='sr-only'>
					Email address
				</label>
				<Input
					id={inputId}
					type='email'
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					placeholder='you@example.com'
					required
					className={cn(isInline ? 'h-8 w-52' : 'sm:flex-1')}
					disabled={isSubmitting}
				/>
				<Button
					type='submit'
					variant={isInline ? 'secondary' : 'primary-gradient'}
					size={isInline ? 'sm' : 'default'}
					isLoading={isSubmitting}
				>
					Subscribe
				</Button>
			</form>
			{message && (
				<p
					className={cn('text-xs', hasError ? 'text-destructive' : 'text-muted-foreground')}
					role='status'
					aria-live='polite'
				>
					{message}
				</p>
			)}
		</div>
	);
}

async function subscribeToNewsletter(email: string) {
	if (!QUARRY_NEWSLETTER_SUBSCRIBE_URL) {
		throw new Error('No newsletter is configured for this deployment.');
	}
	const response = await fetch(QUARRY_NEWSLETTER_SUBSCRIBE_URL, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email: email.trim() }),
	});

	if (!response.ok) {
		throw new Error('Could not subscribe right now.');
	}
}
