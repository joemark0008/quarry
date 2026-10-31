import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import { Lock, SearchX, TriangleAlert } from 'lucide-react';

import styles from './story-access-error.module.css';
import { Button } from '@/components/ui/button';
import { isForbiddenError, isNotFoundError } from '@/lib/api-error';

export function StoryRouteError({ error }: { error?: unknown }) {
	const router = useRouter();
	const { reset } = useQueryErrorResetBoundary();
	return (
		<StoryAccessError
			error={error}
			onRetry={() => {
				reset();
				router.invalidate();
			}}
		/>
	);
}

export function StoryAccessError({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
	const forbidden = isForbiddenError(error);
	const notFound = isNotFoundError(error);

	if (!forbidden && !notFound) {
		return (
			<StoryErrorLayout
				icon={<TriangleAlert className={styles.storyAccessErrorTriangleAlert} aria-hidden />}
				title='Something went wrong'
				description="We couldn't load this story. This is likely a temporary problem, so please try again."
			>
				{onRetry ? <Button onClick={onRetry}>Try again</Button> : null}
				<Button asChild variant='secondary'>
					<Link to='/'>Go home</Link>
				</Button>
			</StoryErrorLayout>
		);
	}

	const title = forbidden ? "You don't have access to this story" : 'Story not found';
	const description = forbidden
		? 'This story has not been shared with you. Ask the owner to share it if you need access.'
		: 'This story may have been deleted or moved.';

	return (
		<StoryErrorLayout
			icon={
				forbidden ? (
					<Lock className={styles.storyAccessErrorTriangleAlert} aria-hidden />
				) : (
					<SearchX className={styles.storyAccessErrorTriangleAlert} aria-hidden />
				)
			}
			title={title}
			description={description}
		>
			<Button asChild variant='secondary'>
				<Link to='/'>Go home</Link>
			</Button>
		</StoryErrorLayout>
	);
}

function StoryErrorLayout({
	icon,
	title,
	description,
	children,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
	children: React.ReactNode;
}) {
	return (
		<div className={styles.storyErrorLayoutDiv}>
			<div className={styles.storyErrorLayoutDiv2}>
				<div className={styles.storyErrorLayoutDiv3}>
					<div className={styles.storyErrorLayoutDiv4}>{icon}</div>
					<div className={styles.storyErrorLayoutDiv5}>
						<h1 className={styles.storyErrorLayoutH1}>{title}</h1>
						<p className={styles.storyErrorLayoutP}>{description}</p>
					</div>
					<div className={styles.storyErrorLayoutDiv6}>{children}</div>
				</div>
			</div>
		</div>
	);
}
