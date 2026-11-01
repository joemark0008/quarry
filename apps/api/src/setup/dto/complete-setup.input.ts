import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength, registerDecorator } from 'class-validator';
import { z } from 'zod/v4';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/**
 * better-auth validates the sign-in email with `z.email()`, which is stricter than class-validator's `@IsEmail`
 * (it rejects `é@x.com`). Setup must refuse anything sign-in would refuse, or it could create an admin who can't log in.
 */
function IsSignInEmail() {
	return (target: object, propertyKey: string) =>
		registerDecorator({
			name: 'isSignInEmail',
			target: target.constructor,
			propertyName: propertyKey,
			validator: {
				validate: (value: unknown) => z.email().safeParse(value).success,
				defaultMessage: () => 'email must be an email',
			},
		});
}

@InputType()
export class CompleteSetupInput {
	@Field()
	@IsString()
	token: string;

	@Field()
	@Transform(trim)
	@IsString()
	@MinLength(1)
	@MaxLength(100)
	name: string;

	@Field()
	@Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
	@IsSignInEmail()
	email: string;

	@Field()
	@IsString()
	@MinLength(8)
	@MaxLength(128)
	password: string;
}
