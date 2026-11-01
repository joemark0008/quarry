import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

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
	@IsEmail()
	email: string;

	@Field()
	@IsString()
	@MinLength(8)
	@MaxLength(128)
	password: string;
}
