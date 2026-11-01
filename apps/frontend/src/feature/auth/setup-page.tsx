import { useNavigate } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import styles from './setup-page.module.css';
import { signIn } from '@/lib/auth-client';
import { AuthForm, FormTextField } from '@/feature/auth/components/auth-form';
import { clearApolloCache } from '@/lib/apollo-client';
import { invalidateSession } from '@/lib/session';
import { rememberSignInMethod } from '@/lib/last-sign-in-method';
import { completeSetup, markSetupComplete } from '@/lib/setup-api';

const INVALID_TOKEN_MESSAGE = 'Invalid setup token.';
const SIGN_IN_FAILED_MESSAGE =
	"Your admin account was created, but signing in failed. Check that BETTER_AUTH_URL matches this site's address, then log in.";

export function Setup() {
	const navigate = useNavigate();
	const [serverError, setServerError] = useState<string>();
	const [tokenError, setTokenError] = useState<string>();

	const form = useForm({
		defaultValues: { token: '', name: '', email: '', password: '' },
		onSubmit: async ({ value }) => {
			setServerError(undefined);
			setTokenError(undefined);

			const result = await completeSetup(value);
			if (result.status === 'invalid-token') {
				setTokenError(INVALID_TOKEN_MESSAGE);
				return;
			}
			if (result.status === 'already-complete') {
				markSetupComplete();
				navigate({ to: '/login', search: { error: undefined, redirect: undefined }, replace: true });
				return;
			}
			if (result.status === 'error') {
				setServerError(result.message);
				return;
			}

			markSetupComplete();
			const { error } = await signIn.email({ email: value.email, password: value.password });
			if (error) {
				// The admin exists, so sign-in from the login page is the way forward.
				navigate({
					to: '/login',
					search: { error: SIGN_IN_FAILED_MESSAGE, redirect: undefined },
					replace: true,
				});
				return;
			}

			invalidateSession();
			rememberSignInMethod('email');
			// Cached results (`me`, public config) belong to the previous visitor.
			await clearApolloCache();
			navigate({ to: '/' });
		},
	});

	return (
		<AuthForm form={form} title='Set up quarry' submitText='Create admin account' serverError={serverError}>
			<FormTextField
				form={form}
				name='token'
				title='Setup token'
				description='Printed in the server logs when quarry starts.'
				error={tokenError}
				className={styles.setupFormTextField}
			/>
			<FormTextField form={form} name='name' title='Name' className={styles.setupFormTextField} />
			<FormTextField form={form} name='email' type='email' title='Email' className={styles.setupFormTextField} />
			<FormTextField
				form={form}
				name='password'
				type='password'
				title='Password'
				className={styles.setupFormTextField2}
			/>
		</AuthForm>
	);
}
