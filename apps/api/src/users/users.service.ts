import { Injectable } from '@nestjs/common';
import { hashPassword } from 'better-auth/crypto';

import { HandlerError } from '../common/errors/handler-error.js';
import { regexPassword } from '../common/utils/auth-utils.js';
import type { User as DbUser } from '../generated/prisma/client.js';
import { DEACTIVATED_ACCOUNT_MESSAGE } from './account-status.js';
import type { User } from './models/user.model.js';
import { UserRepository } from './user.repository.js';

/** Ports of upstream trpc `user` (hasUsers), `account` (modifyPassword) and `account-status.service.ts`. */
@Injectable()
export class UsersService {
	constructor(private readonly users: UserRepository) {}

	async hasUsers(): Promise<boolean> {
		return (await this.users.countUsers()) > 0;
	}

	async getUser(userId: string): Promise<User> {
		const user = await this.users.getUser({ id: userId });
		if (!user) {
			throw new HandlerError('NOT_FOUND', 'User not found');
		}
		return toUserModel(user);
	}

	async updateProfile(userId: string, name: string): Promise<User> {
		await this.users.updateUser(userId, name.trim());
		return this.getUser(userId);
	}

	async modifyPassword(userId: string, newPassword: string, confirmPassword: string): Promise<void> {
		const account = await this.users.getCredentialAccount(userId);
		if (!account || !account.password) {
			throw new HandlerError('NOT_FOUND', 'User account not found or user does not use password authentication.');
		}

		if (newPassword !== confirmPassword) {
			throw new HandlerError('BAD_REQUEST', 'Passwords do not match.');
		}

		if (!regexPassword.test(newPassword)) {
			throw new HandlerError(
				'BAD_REQUEST',
				'New password must be at least 8 characters long and include uppercase, lowercase, number, and special character.',
			);
		}

		const hashedPassword = await hashPassword(newPassword);
		await this.users.updateAccountPassword(account.id, hashedPassword, userId, false);
	}

	async assertUserIsActive(userId: string): Promise<void> {
		if (await this.users.isUserDeactivated(userId)) {
			throw new HandlerError('FORBIDDEN', DEACTIVATED_ACCOUNT_MESSAGE);
		}
	}
}

export function toUserModel(user: DbUser): User {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		image: user.image,
		emailVerified: user.emailVerified,
		requiresPasswordReset: user.requiresPasswordReset,
		isActive: !user.deactivatedAt,
		createdAt: user.createdAt,
	};
}
