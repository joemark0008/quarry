import { useState } from 'react';
import { Mail } from 'lucide-react';

import { cn } from '@/lib/utils';
import { createLocalStorage } from '@/lib/local-storage';
import GithubIcon from '@/components/icons/github-icon.svg';
import { NewsletterSubscribeDialog } from '@/components/newsletter-subscribe';
import SlackIcon from '@/components/icons/slack.svg';
import { QUARRY_COMMUNITY_URL, QUARRY_NEWSLETTER_SUBSCRIBE_URL, QUARRY_REPOSITORY_URL } from '@/lib/quarry-links';

interface SidebarCommunityProps {
	isCollapsed: boolean;
}

const newsletterNotificationDismissed = createLocalStorage<boolean>('newsletter-notification-dismissed', false);

export function SidebarCommunity({ isCollapsed }: SidebarCommunityProps) {
	const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
	const [showNotification, setShowNotification] = useState(() => !newsletterNotificationDismissed.get());

	const handleNewsletterClick = () => {
		setIsNewsletterOpen(true);
		if (showNotification) {
			setShowNotification(false);
			newsletterNotificationDismissed.set(true);
		}
	};

	if (isCollapsed || (!QUARRY_REPOSITORY_URL && !QUARRY_COMMUNITY_URL && !QUARRY_NEWSLETTER_SUBSCRIBE_URL)) {
		return null;
	}

	return (
		<div className='flex items-center px-4 pb-3'>
			<span className='text-[10px] uppercase tracking-widest text-muted-foreground/30 font-medium mr-auto'>
				Community
			</span>
			<div className='flex items-center gap-0.5'>
				{QUARRY_REPOSITORY_URL && (
					<a
						href={QUARRY_REPOSITORY_URL}
						target='_blank'
						rel='noopener noreferrer'
						className={cn(
							'p-1.5 rounded-full text-muted-foreground/40 hover:text-muted-foreground hover:bg-sidebar-accent transition-colors',
						)}
						title='GitHub'
					>
						<GithubIcon className='size-3.5' />
					</a>
				)}
				{QUARRY_COMMUNITY_URL && (
					<a
						href={QUARRY_COMMUNITY_URL}
						target='_blank'
						rel='noopener noreferrer'
						className={cn(
							'p-1.5 rounded-full text-muted-foreground/40 hover:text-muted-foreground hover:bg-sidebar-accent transition-colors',
						)}
						title='Join Slack'
					>
						<SlackIcon className='size-3.5 grayscale brightness-0 dark:brightness-200 opacity-30' />
					</a>
				)}
				{QUARRY_NEWSLETTER_SUBSCRIBE_URL && (
					<button
						type='button'
						onClick={handleNewsletterClick}
						className={cn(
							'relative p-1.5 rounded-full text-muted-foreground/40 hover:text-muted-foreground hover:bg-sidebar-accent transition-colors',
						)}
						title='Subscribe to newsletter'
						aria-label='Subscribe to newsletter'
					>
						<Mail className='size-3.5' />
						{showNotification && (
							<span
								className='absolute top-0.5 right-0.5 size-1.5 rounded-full bg-primary ring-2 ring-sidebar'
								aria-hidden='true'
							/>
						)}
					</button>
				)}
			</div>
			<NewsletterSubscribeDialog open={isNewsletterOpen} onOpenChange={setIsNewsletterOpen} />
		</div>
	);
}
