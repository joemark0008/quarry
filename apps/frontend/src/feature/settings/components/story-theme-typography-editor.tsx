import { ROLE_LIMITS, STORY_TEXT_ROLE_LABELS, STORY_TEXT_ROLES } from '@quarry/shared/story-theme-typography';
import { Italic } from 'lucide-react';
import { useState } from 'react';
import styles from './story-theme-typography-editor.module.css';
import type { StoryTextRole, StoryTextRoleStyle, StoryTypography } from '@quarry/shared/story-theme-typography';
import type { StoryTheme } from '@quarry/shared/story-theme';
import type { CSSProperties } from 'react';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const FONT_OPTIONS = [
	{ value: 'heading', label: 'Heading' },
	{ value: 'body', label: 'Body' },
] as const;
const WEIGHT_OPTIONS = [300, 400, 500, 600, 700, 800].map((weight) => ({ value: weight, label: String(weight) }));
const CASE_OPTIONS = [
	{ value: 'none', label: 'As written' },
	{ value: 'uppercase', label: 'UPPERCASE' },
	{ value: 'capitalize', label: 'Capitalize' },
	{ value: 'lowercase', label: 'lowercase' },
] as const;
const SAMPLE_FONT_SIZE = 15;
const GRID_CLASS = styles.gRIDCLASS;

interface StoryThemeTypographyEditorProps {
	theme: StoryTheme;
	onChange: (typography: StoryTypography) => void;
}

/** One row per text role, each previewed in its own voice, so the admin sees what a change does as they make it. */
export function StoryThemeTypographyEditor({ theme, onChange }: StoryThemeTypographyEditorProps) {
	const { typography } = theme.text;
	const updateRole = (role: StoryTextRole, patch: Partial<StoryTextRoleStyle>) =>
		onChange({ ...typography, [role]: { ...typography[role], ...patch } });

	return (
		<div className={styles.storyThemeTypographyEditorDiv}>
			<div className={cn(GRID_CLASS, styles.storyThemeTypographyEditorDiv2)}>
				<span>Role</span>
				<span>Font</span>
				<span>Weight</span>
				<span>Case</span>
				<span>Italic</span>
				<span>Spacing</span>
				<span>Size</span>
			</div>
			{STORY_TEXT_ROLES.map((role) => (
				<TypographyRow
					key={role}
					role={role}
					style={typography[role]}
					theme={theme}
					onChange={(patch) => updateRole(role, patch)}
				/>
			))}
		</div>
	);
}

interface TypographyRowProps {
	role: StoryTextRole;
	style: StoryTextRoleStyle;
	theme: StoryTheme;
	onChange: (patch: Partial<StoryTextRoleStyle>) => void;
}

function TypographyRow({ role, style, theme, onChange }: TypographyRowProps) {
	const { label, description, sample } = STORY_TEXT_ROLE_LABELS[role];
	return (
		<div className={cn(GRID_CLASS, styles.typographyRowDiv)}>
			<div className={styles.typographyRowDiv2}>
				<p className={styles.typographyRowP} style={sampleStyle(style, theme)} title={description}>
					{sample}
				</p>
				<p className={styles.typographyRowP2}>{label}</p>
			</div>
			<CompactSelect
				label={`${label} font`}
				value={style.font}
				options={FONT_OPTIONS}
				onChange={(font) => onChange({ font })}
			/>
			<CompactSelect
				label={`${label} weight`}
				value={style.weight}
				options={WEIGHT_OPTIONS}
				onChange={(weight) => onChange({ weight })}
			/>
			<CompactSelect
				label={`${label} case`}
				value={style.case}
				options={CASE_OPTIONS}
				onChange={(textCase) => onChange({ case: textCase })}
			/>
			<button
				type='button'
				aria-label={`${label} in italics`}
				aria-pressed={style.italic}
				onClick={() => onChange({ italic: !style.italic })}
				className={cn(styles.typographyRowButton, style.italic && styles.typographyRowButton2)}
			>
				<Italic className={styles.typographyRowItalic} />
			</button>
			<CompactNumber
				label={`${label} letter spacing (em)`}
				value={style.tracking}
				onChange={(tracking) => onChange({ tracking })}
				{...ROLE_LIMITS.tracking}
				step={0.01}
			/>
			<CompactNumber
				label={`${label} size multiplier`}
				value={style.size}
				onChange={(size) => onChange({ size })}
				{...ROLE_LIMITS.size}
				step={0.05}
			/>
		</div>
	);
}

function sampleStyle(style: StoryTextRoleStyle, theme: StoryTheme): CSSProperties {
	return {
		fontSize: `${SAMPLE_FONT_SIZE * style.size}px`,
		fontFamily: style.font === 'heading' ? theme.text.headingFont : theme.text.bodyFont,
		fontWeight: style.weight,
		fontStyle: style.italic ? 'italic' : 'normal',
		textTransform: style.case,
		letterSpacing: `${style.tracking}em`,
	};
}

interface CompactSelectProps<Value extends string | number> {
	label: string;
	value: Value;
	options: readonly { value: Value; label: string }[];
	onChange: (value: Value) => void;
}

function CompactSelect<Value extends string | number>({ label, value, options, onChange }: CompactSelectProps<Value>) {
	return (
		<Select
			value={String(value)}
			onValueChange={(next) => {
				const option = options.find((candidate) => String(candidate.value) === next);
				if (option) {
					onChange(option.value);
				}
			}}
		>
			<SelectTrigger className={styles.compactSelectSelectTrigger} aria-label={label}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option.value} value={String(option.value)}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

interface CompactNumberProps {
	label: string;
	value: number;
	onChange: (value: number) => void;
	min: number;
	max: number;
	step: number;
}

function CompactNumber({ label, value, onChange, min, max, step }: CompactNumberProps) {
	const [draft, setDraft] = useState<string | null>(null);

	const commit = (raw: string) => {
		setDraft(raw);
		const next = Number(raw);
		if (raw.trim() !== '' && !Number.isNaN(next) && next >= min && next <= max) {
			onChange(next);
		}
	};

	return (
		<Input
			type='number'
			value={draft ?? String(value)}
			min={min}
			max={max}
			step={step}
			onFocus={() => setDraft(String(value))}
			onChange={(event) => commit(event.target.value)}
			onBlur={() => setDraft(null)}
			className={styles.compactNumberInput}
			aria-label={label}
		/>
	);
}
