import { createContext, useContext, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { InputGroup } from './ui/input-group';
import { NakedInput } from '@/components/ui/input';
import { Button, ChatButton, AuthSocialButton } from '@/components/ui/button';
import { LastUsedPill } from '@/components/ui/last-used-pill';
import GithubIcon from '@/components/icons/github-icon.svg';
import GitlabIcon from '@/components/icons/gitlab-icon.svg';
import GoogleIcon from '@/components/icons/google-icon.svg';
import QuarryLogo from '@/components/icons/quarry-full-logo.svg';
import { BrandGradientBackdrop } from '@/components/brand-gradient-backdrop';
import { usePublicConfig } from '@/hooks/use-public-config';
import { handleGithubSignIn, handleGitlabSignIn, handleGoogleSignIn } from '@/lib/auth-client';
import { loadLastSignInMethod, rememberSignInMethod } from '@/lib/last-sign-in-method';
import { cn } from '@/lib/utils';
import styles from './auth-form.module.css';

/**
 * Shrinks the email/password fields when sign-in providers are on screen, so the
 * provider buttons read as the primary way in.
 */
const CompactFieldsContext = createContext({ compact: false, emailLastUsed: false });

const DEFAULT_BRAND_COLOR = '#0F6E56';

interface AuthFormProps {
	form?: any;
	title: string;
	titleClassName?: string;
	submitText?: string;
	children?: React.ReactNode;
	serverError?: string;
	displaySocialProviders?: boolean;
	socialCallbackUrl?: string;
	displayEmailPasswordForm?: boolean;
	emailPasswordDisabledMessage?: string;
	footer?: React.ReactNode;
	content?: React.ReactNode;
}

export function AuthForm({
	form,
	title,
	titleClassName,
	submitText,
	children,
	serverError,
	displaySocialProviders,
	socialCallbackUrl,
	displayEmailPasswordForm = true,
	emailPasswordDisabledMessage,
	footer,
	content,
}: AuthFormProps) {
	const config = usePublicConfig();
	const authProviders = config.data?.authProviders;

	const [lastSignInMethod] = useState(loadLastSignInMethod);
	const [isEmailFormExpanded, setIsEmailFormExpanded] = useState(lastSignInMethod === 'email');

	const socialProviders = [
		authProviders?.google && (
			<AuthSocialButton
				key='google'
				icon={GoogleIcon}
				label='Continue with Google'
				onClick={() => {
					rememberSignInMethod('google');
					handleGoogleSignIn(socialCallbackUrl);
				}}
				lastUsed={lastSignInMethod === 'google'}
			/>
		),
		authProviders?.github && (
			<AuthSocialButton
				key='github'
				icon={GithubIcon}
				label='Continue with GitHub'
				onClick={() => {
					rememberSignInMethod('github');
					handleGithubSignIn(socialCallbackUrl);
				}}
				lastUsed={lastSignInMethod === 'github'}
			/>
		),
		authProviders?.gitlab && (
			<AuthSocialButton
				key='gitlab'
				icon={GitlabIcon}
				label='Continue with GitLab'
				onClick={() => {
					rememberSignInMethod('gitlab');
					handleGitlabSignIn(socialCallbackUrl);
				}}
				lastUsed={lastSignInMethod === 'gitlab'}
			/>
		),
	].filter(Boolean);

	const areSocialProvidersPending = Boolean(displaySocialProviders && config.isPending);
	const hasAnyProvider = socialProviders.length > 0;
	const showsProviders = Boolean(displaySocialProviders && !areSocialProvidersPending && hasAnyProvider);
	const showEmailForm =
		!areSocialProvidersPending && displayEmailPasswordForm && (!showsProviders || isEmailFormExpanded);

	return (
		<div className={styles.authFormDiv}>
			<div className={styles.authFormDiv2}>
				<div className={styles.authFormDiv3}>
					<div
						className={cn(`${styles.authFormDiv4} start`, content ? styles.authFormDiv5 : styles.authFormDiv6)}
					>
						<QuarryLogo className={styles.authFormQuarryLogo} />
						<h1 className={cn(styles.authFormH1, titleClassName)}>{title}</h1>
					</div>

					{showsProviders && (
						<div className={styles.authFormDiv7}>
							<div className={styles.authFormDiv8}>{socialProviders}</div>

							{displayEmailPasswordForm && (
								<div className={styles.authFormDiv9}>
									<div className={styles.authFormDiv10}>
										<div className={styles.authFormDiv11} />
									</div>
									<div className={styles.authFormDiv12}>
										<span className={styles.authFormSpan}>Or</span>
									</div>
								</div>
							)}

							{displayEmailPasswordForm && !isEmailFormExpanded && (
								<button
									type='button'
									onClick={() => setIsEmailFormExpanded(true)}
									className={styles.authFormButton}
								>
									<span className={styles.authFormSpan2}>Use email and password</span>
								</button>
							)}
						</div>
					)}

					{serverError && <p className={styles.authFormP}>{serverError}</p>}

					{content ? (
						content
					) : showEmailForm && form && submitText ? (
						<CompactFieldsContext.Provider
							value={{
								compact: showsProviders,
								emailLastUsed: Boolean(displaySocialProviders && lastSignInMethod === 'email'),
							}}
						>
							<form
								onSubmit={(e) => {
									e.preventDefault();
									form.handleSubmit();
								}}
							>
								{children}

								<form.Subscribe selector={(state: { canSubmit: boolean }) => state.canSubmit}>
									{(canSubmit: boolean) => (
										<Button
											type='submit'
											variant={canSubmit ? 'primary-gradient' : 'default'}
											className={cn(
												styles.authFormButton2,
												showsProviders ? styles.authFormButton3 : styles.authFormButton4,
												!canSubmit && styles.authFormButton5,
											)}
											disabled={!canSubmit}
										>
											{submitText}
										</Button>
									)}
								</form.Subscribe>
							</form>
						</CompactFieldsContext.Provider>
					) : (
						!displayEmailPasswordForm &&
						emailPasswordDisabledMessage && (
							<p className={styles.authFormP2}>{emailPasswordDisabledMessage}</p>
						)
					)}

					{footer && <div className={styles.authFormDiv13}>{footer}</div>}
				</div>
			</div>
			<AuthSidePanel />
		</div>
	);
}

function AuthSidePanel() {
	const [value, setValue] = useState('');

	return (
		<div className={styles.authSidePanelDiv}>
			<BrandGradientBackdrop color={DEFAULT_BRAND_COLOR} className={styles.authSidePanelBrandGradientBackdrop} />
			<div className={styles.authSidePanelDiv2}>
				<InputGroup
					htmlFor='chat-input'
					className={cn(
						styles.authSidePanelInputGroup,
						styles.authSidePanelInputGroup2,
						styles.authSidePanelInputGroup3,
						styles.authSidePanelInputGroup4,
						styles.authSidePanelInputGroup5,
						styles.authSidePanelInputGroup6,
						styles.authSidePanelInputGroup7,
						styles.authSidePanelInputGroup8,
					)}
				>
					<NakedInput
						id='chat-input'
						value={value}
						onChange={(e) => setValue(e.target.value)}
						placeholder='Ask anything about your data...'
						className={styles.authSidePanelNakedInput}
					/>
					<ChatButton showStop={false} type='button' />
				</InputGroup>
			</div>
		</div>
	);
}

interface FormTextFieldProps {
	form: any;
	name: string;
	type?: string;
	title: string;
	placeholder?: string;
	className?: string;
}

export function FormTextField({ form, name, type = 'text', title, placeholder, className }: FormTextFieldProps) {
	const [showPassword, setShowPassword] = useState(false);
	const { compact, emailLastUsed } = useContext(CompactFieldsContext);
	const isPassword = type === 'password';
	const inputType = isPassword && showPassword ? 'text' : type;
	const eyeIconSize = compact ? 16 : 18;
	const showLastUsed = emailLastUsed && name === 'email';

	return (
		<form.Field
			name={name}
			validators={{
				onMount: ({ value }: { value: string }) => (!value ? 'Required' : undefined),
				onChange: ({ value }: { value: string }) => (!value ? 'Required' : undefined),
			}}
		>
			{(field: { state: { value: string }; handleChange: (v: string) => void; handleBlur: () => void }) => (
				<div className={cn(styles.formTextFieldDiv, compact ? styles.formTextFieldDiv2 : styles.formTextFieldDiv3, className)}>
					<label
						htmlFor={name}
						className={cn(styles.formTextFieldLabel, compact ? styles.formTextFieldLabel2 : styles.formTextFieldLabel3)}
					>
						{title ?? name.charAt(0).toUpperCase() + name.slice(1)}
					</label>
					<div className={styles.authFormDiv9}>
						<NakedInput
							name={name}
							type={inputType}
							placeholder={placeholder}
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							onBlur={field.handleBlur}
							className={cn(
								styles.formTextFieldNakedInput,
								compact ? styles.formTextFieldNakedInput2 : styles.formTextFieldNakedInput3,
								isPassword && (compact ? styles.formTextFieldNakedInput4 : styles.formTextFieldNakedInput5),
							)}
						/>
						{showLastUsed && <LastUsedPill className={styles.formTextFieldLastUsedPill} />}
						{isPassword && (
							<button
								type='button'
								onClick={() => setShowPassword(!showPassword)}
								className={cn(
									styles.formTextFieldButton,
									compact ? styles.formTextFieldButton2 : styles.formTextFieldButton3,
								)}
								tabIndex={-1}
								aria-label={showPassword ? 'Hide password' : 'Show password'}
							>
								{showPassword ? (
									<EyeOff size={eyeIconSize} />
								) : (
									<Eye
										size={eyeIconSize}
										className={styles.formTextFieldEye}
									/>
								)}
							</button>
						)}
					</div>
				</div>
			)}
		</form.Field>
	);
}
