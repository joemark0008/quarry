import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import type { AuthUser } from '../auth/auth.service.js';
import { CurrentUser } from '../common/decorators/current.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { ModifyPasswordInput } from './dto/modify-password.input.js';
import { UpdateProfileInput } from './dto/update-profile.input.js';
import { User } from './models/user.model.js';
import { UsersService } from './users.service.js';

@Resolver(() => User)
export class UsersResolver {
	constructor(private readonly users: UsersService) {}

	@Public()
	@Query(() => Boolean, { description: 'Whether anyone has signed up yet (the login page offers sign-up when not).' })
	hasUsers(): Promise<boolean> {
		return this.users.hasUsers();
	}

	@Query(() => User, { description: 'The signed-in user.' })
	me(@CurrentUser() user: AuthUser): Promise<User> {
		return this.users.getUser(user.id);
	}

	@Mutation(() => User)
	updateProfile(@CurrentUser() user: AuthUser, @Args('input') input: UpdateProfileInput): Promise<User> {
		return this.users.updateProfile(user.id, input.name);
	}

	@Mutation(() => Boolean)
	async modifyPassword(@CurrentUser() user: AuthUser, @Args('input') input: ModifyPasswordInput): Promise<boolean> {
		await this.users.modifyPassword(user.id, input.newPassword, input.confirmPassword);
		return true;
	}
}
