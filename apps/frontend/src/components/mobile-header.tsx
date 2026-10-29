import { PanelLeft } from 'lucide-react';
import { ChatArtifactsMenu } from '@/components/chat-artifacts-menu';
import { EditableChatTitle } from '@/components/editable-chat-title';
import { ExampleProjectInfoCard } from '@/components/example-project-info-card';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/contexts/sidebar';

export function MobileHeader({
	chatId,
	title,
	showExampleProjectInfo = false,
}: {
	chatId?: string;
	title?: string;
	showExampleProjectInfo?: boolean;
}) {
	const { isMobile, openMobile } = useSidebar();

	if (!isMobile) {
		return null;
	}

	return (
		<div className='group/header relative z-20 flex items-center gap-2 px-3 py-2 shrink-0 border-b border-border/60 bg-panel/95 backdrop-blur supports-[backdrop-filter]:bg-panel/80'>
			<Button variant='outline' size='sm' onClick={openMobile} className='gap-2 rounded-full px-3 shadow-none'>
				<PanelLeft className='size-4 shrink-0' strokeWidth={1.5} />
			</Button>
			{showExampleProjectInfo && <ExampleProjectInfoCard compact />}
			{chatId && title && (
				<>
					<EditableChatTitle
						chatId={chatId}
						title={title}
						className='text-sm text-muted-foreground min-w-0 flex-1'
					/>
				</>
			)}
			<div className='ml-auto flex shrink-0 items-center gap-1'>
				{chatId && <ChatArtifactsMenu key={chatId} chatId={chatId} panelClassName='right-3 mt-1' />}
			</div>
		</div>
	);
}
