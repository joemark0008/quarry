import { Field, ID, InputType } from '@nestjs/graphql';
import {
	isReservedSandboxSecretName,
	SANDBOX_SECRET_DESCRIPTION_MAX_LENGTH,
	SANDBOX_SECRET_NAME_MAX_LENGTH,
	SANDBOX_SECRET_NAME_PATTERN,
	SANDBOX_SECRET_VALUE_MAX_LENGTH,
	SANDBOX_SECRET_VALUE_MIN_LENGTH,
} from '@quarry/shared/types';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength, MinLength, ValidateBy } from 'class-validator';

/** Upstream's zod `.trim()`: names and descriptions are validated trimmed. */
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

const NotReservedSandboxSecretName = () =>
	ValidateBy({
		name: 'notReservedSandboxSecretName',
		validator: {
			validate: (value: unknown) => typeof value !== 'string' || !isReservedSandboxSecretName(value),
			defaultMessage: () => 'This name is reserved by the sandbox runtime. Choose another one.',
		},
	});

/** Upstream tRPC `sandboxSecret.set` input. */
@InputType()
export class SetSandboxSecretInput {
	@Field()
	@Transform(trim)
	@IsString()
	@MinLength(1)
	@MaxLength(SANDBOX_SECRET_NAME_MAX_LENGTH)
	@Matches(SANDBOX_SECRET_NAME_PATTERN, {
		message:
			'Use an environment variable name: uppercase letters, digits and underscores, not starting with a digit.',
	})
	@NotReservedSandboxSecretName()
	name: string;

	@Field()
	@IsString()
	@MinLength(SANDBOX_SECRET_VALUE_MIN_LENGTH, {
		message: `A secret must be at least ${SANDBOX_SECRET_VALUE_MIN_LENGTH} characters.`,
	})
	@MaxLength(SANDBOX_SECRET_VALUE_MAX_LENGTH)
	value: string;

	@Field(() => String, { nullable: true })
	@Transform(trim)
	@IsOptional()
	@IsString()
	@MaxLength(SANDBOX_SECRET_DESCRIPTION_MAX_LENGTH)
	description?: string | null;
}

/** Upstream tRPC `sandboxSecret.updateDescription` input. */
@InputType()
export class UpdateSandboxSecretDescriptionInput {
	@Field(() => ID)
	@IsString()
	secretId: string;

	@Field(() => String, { nullable: true })
	@Transform(trim)
	@IsOptional()
	@IsString()
	@MaxLength(SANDBOX_SECRET_DESCRIPTION_MAX_LENGTH)
	description?: string | null;
}
