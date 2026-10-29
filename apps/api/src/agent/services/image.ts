/**
 * Stand-in for upstream `queries/image.queries` (chat image attachments arrive with Phase 2d): no chat has
 * images yet, so the sandbox gets none.
 */
export interface ChatImage {
	id: string;
	data: string;
	mediaType: string;
}

export async function getImagesByChatId(_chatId: string): Promise<ChatImage[]> {
	return [];
}
