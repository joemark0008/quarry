import { useQuery } from '@apollo/client/react';
import { CircleArrowUp } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, hideIf } from '@/lib/utils';
import { CheckUpdateDocument } from '@/graphql/generated/graphql';
import { QUARRY_REPOSITORY_URL } from '@/lib/quarry-links';

interface SidebarVersionNoticeProps {
	isCollapsed: boolean;
}

export function SidebarVersionNotice({ isCollapsed }: SidebarVersionNoticeProps) {
	const { data: result } = useQuery(CheckUpdateDocument);
	const data = result?.checkUpdate;

	if (!data?.updateAvailable || !data.latestVersion) {
		return null;
	}

	const label = `v${data.latestVersion} available`;

	if (isCollapsed) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<div className='flex items-center justify-center p-2 mb-1 rounded-md text-green-500'>
						<CircleArrowUp className='size-4' />
					</div>
				</TooltipTrigger>
				<TooltipContent side='right'>{label}</TooltipContent>
			</Tooltip>
		);
	}

	return (
		<a
			href={QUARRY_REPOSITORY_URL ? `${QUARRY_REPOSITORY_URL}/releases/tag/v${data.latestVersion}` : undefined}
			target='_blank'
			rel='noopener noreferrer'
			className='flex items-center gap-2 px-3 py-2 mb-1 rounded-md text-xs text-green-500 hover:bg-sidebar-accent transition-colors'
		>
			<CircleArrowUp className='size-3.5 shrink-0' />
			<span className={cn('truncate transition-[opacity,visibility] duration-300', hideIf(isCollapsed))}>
				{label}
			</span>
		</a>
	);
}
