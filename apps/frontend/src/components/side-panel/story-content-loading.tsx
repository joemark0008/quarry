import QuarryLogoAnimated from '@/components/icons/quarry-logo-animated';

export function StoryContentLoading() {
	return (
		<div className='flex flex-1 h-full items-center justify-center p-6 text-muted-foreground'>
			<div className='flex items-baseline justify-center gap-6'>
				<QuarryLogoAnimated height={16} width={16} durationSeconds={2.2} title='' />
				<span className='font-medium text-foreground'>Loading story content...</span>
			</div>
		</div>
	);
}
