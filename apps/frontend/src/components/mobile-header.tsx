import { ChatArtifactsMenu } from '@/components/chat-artifacts-menu';
import { EditableChatTitle } from '@/components/editable-chat-title';
import { ExampleProjectInfoCard } from '@/components/example-project-info-card';
import { useSidebar } from '@/contexts/sidebar';
import styles from './mobile-header.module.css';

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
		<div className={`${styles.mobileHeaderDiv} group/header`}>
			{showExampleProjectInfo && <ExampleProjectInfoCard compact />}
			{chatId && title && (
				<>
					<EditableChatTitle
						chatId={chatId}
						title={title}
						className={styles.mobileHeaderEditableChatTitle}
					/>
				</>
			)}
			<div className={styles.mobileHeaderDiv2}>
				{chatId && <ChatArtifactsMenu key={chatId} chatId={chatId} panelClassName={styles.mobileHeaderChatArtifactsMenu} />}
			</div>
		</div>
	);
}
