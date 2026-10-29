import { Module } from '@nestjs/common';

import { ChatRepository } from './chat.repository.js';

/** Chat persistence, shared by the agent (which writes messages) and the chats API. */
@Module({
	providers: [ChatRepository],
	exports: [ChatRepository],
})
export class ChatsCoreModule {}
