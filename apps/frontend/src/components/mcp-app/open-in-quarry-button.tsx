import { ExternalLink } from 'lucide-react';
import type { MouseEvent } from 'react';

import { Button } from '@/components/ui/button';

interface OpenInQuarryButtonProps {
	url: string;
}

export function OpenInQuarryButton({ url }: OpenInQuarryButtonProps) {
	return (
		<Button variant='outline' size='sm' className='gap-1.5' asChild title='Open in quarry'>
			<a href={url} target='_blank' rel='noopener noreferrer' onClick={(e) => openLinkViaHost(e, url)}>
				<ExternalLink className='size-3.5' />
				<span className='hidden sm:inline'>Open in quarry</span>
			</a>
		</Button>
	);
}

function openLinkViaHost(event: MouseEvent<HTMLAnchorElement>, url: string) {
	if (window.parent === window) {
		return;
	}
	event.preventDefault();
	window.parent.postMessage({ type: 'quarry-open-link', url }, '*');
}
