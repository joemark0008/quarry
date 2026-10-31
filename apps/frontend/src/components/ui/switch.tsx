import { Switch as MantineSwitch } from '@mantine/core';

import { cn } from '@/lib/utils';

const trackClassName =
	'relative inline-flex h-5 w-8 shrink-0 items-center rounded-full px-0.5 bg-muted shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]';

function SwitchThumb({ checked }: { checked: boolean }) {
	return (
		<>
			<span
				aria-hidden='true'
				className={cn(
					'pointer-events-none absolute inset-0 rounded-full bg-brand-gradient transition-opacity',
					checked ? 'opacity-100' : 'opacity-0',
				)}
			/>
			<span
				className={cn(
					'pointer-events-none relative block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform',
					checked ? 'translate-x-3' : 'translate-x-0',
				)}
			/>
		</>
	);
}

interface SwitchProps {
	checked: boolean;
	onCheckedChange?: (checked: boolean) => void;
	disabled?: boolean;
	id?: string;
	className?: string;
	'aria-label'?: string;
	'aria-labelledby'?: string;
}

export function Switch({
	checked,
	onCheckedChange,
	disabled,
	id,
	className,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledby,
}: SwitchProps) {
	return (
		<MantineSwitch
			id={id}
			size='sm'
			withThumbIndicator={false}
			checked={checked}
			disabled={disabled}
			aria-label={ariaLabel}
			aria-labelledby={ariaLabelledby}
			className={className}
			onChange={(event) => onCheckedChange?.(event.currentTarget.checked)}
		/>
	);
}

export function SwitchIndicator({ checked, className }: { checked: boolean; className?: string }) {
	return (
		<span aria-hidden='true' className={cn(trackClassName, className)}>
			<SwitchThumb checked={checked} />
		</span>
	);
}
