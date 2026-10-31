import { createFileRoute } from '@tanstack/react-router';
import { SignUp } from '@/feature/auth/signup-page';

export const Route = createFileRoute('/_public/signup')({
	validateSearch: (search: Record<string, unknown>) => ({
		error: typeof search.error === 'string' ? search.error : undefined,
		redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
	}),
	component: SignUp,
});
