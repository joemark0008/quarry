export interface GitIdentity {
	name: string;
	email: string;
}

export const QUARRY_CO_AUTHOR: GitIdentity = {
	name: 'quarry',
	email: 'agent@quarry.invalid',
};

export function withCoAuthors(message: string, coAuthors: GitIdentity[]): string {
	if (coAuthors.length === 0) {
		return message;
	}
	const trailers = coAuthors.map((coAuthor) => `Co-authored-by: ${coAuthor.name} <${coAuthor.email}>`).join('\n');
	return `${message.trimEnd()}\n\n${trailers}`;
}
