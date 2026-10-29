import { QUERY_TOOL_PARAMETER_TYPES } from '@quarry/shared/query-tools';
import { Trash2 } from 'lucide-react';
import type { QueryToolParameter, QueryToolParameterType } from '@quarry/shared/query-tools';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

/** Parameters of a tool: one row per `{{ name }}` placeholder, with its type, default and test value. */
export function QueryToolParameters({
	parameters,
	values,
	onChange,
	onValuesChange,
	placeholders,
}: {
	parameters: QueryToolParameter[];
	/** Values used by Preview, by parameter name. */
	values: Record<string, string>;
	onChange: (parameters: QueryToolParameter[]) => void;
	onValuesChange: (values: Record<string, string>) => void;
	/** Placeholders found in the SQL, to flag the ones without a parameter and the unused parameters. */
	placeholders: string[];
}) {
	const update = (index: number, patch: Partial<QueryToolParameter>) =>
		onChange(parameters.map((parameter, i) => (i === index ? { ...parameter, ...patch } : parameter)));
	const missing = placeholders.filter((name) => !parameters.some((parameter) => parameter.name === name));

	return (
		<div className='flex flex-col gap-2'>
			{parameters.length === 0 && missing.length === 0 && (
				<p className='text-xs text-muted-foreground'>
					No parameters. Write <code className='font-mono'>{'{{ name }}'}</code> in the SQL where a value
					should go, e.g. <code className='font-mono'>{'WHERE status = {{ status }}'}</code>: the agent fills
					it in, and it is sent to the warehouse as a bound value, never pasted into the SQL.
				</p>
			)}
			{parameters.length > 0 && (
				<div className='grid grid-cols-[minmax(0,1.2fr)_8rem_minmax(0,1.6fr)_5rem_minmax(0,1fr)_minmax(0,1fr)_2rem] gap-2 text-xs text-muted-foreground'>
					<span>Name</span>
					<span>Type</span>
					<span>Description</span>
					<span>Required</span>
					<span>Default</span>
					<span>Test value</span>
					<span />
				</div>
			)}
			{parameters.map((parameter, index) => (
				<div
					key={index}
					className='grid grid-cols-[minmax(0,1.2fr)_8rem_minmax(0,1.6fr)_5rem_minmax(0,1fr)_minmax(0,1fr)_2rem] items-center gap-2'
				>
					<Input
						value={parameter.name}
						onChange={(event) => update(index, { name: event.target.value })}
						className='font-mono h-8 text-xs'
						aria-label='Parameter name'
					/>
					<Select
						value={parameter.type}
						onValueChange={(type) => update(index, { type: type as QueryToolParameterType })}
					>
						<SelectTrigger className='h-8 text-xs' aria-label='Parameter type'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{QUERY_TOOL_PARAMETER_TYPES.map((type) => (
								<SelectItem key={type} value={type}>
									{type}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Input
						value={parameter.description ?? ''}
						onChange={(event) => update(index, { description: event.target.value })}
						placeholder='What the agent should pass'
						className='h-8 text-xs'
						aria-label='Parameter description'
					/>
					<Switch
						checked={parameter.required}
						onCheckedChange={(required) => update(index, { required })}
						aria-label='Required'
					/>
					<Input
						value={
							parameter.default === undefined || parameter.default === null
								? ''
								: String(parameter.default)
						}
						onChange={(event) =>
							update(index, { default: parseDefault(parameter.type, event.target.value) })
						}
						placeholder={parameter.type === 'date' ? 'YYYY-MM-DD' : ''}
						className='h-8 text-xs'
						aria-label='Default value'
					/>
					<Input
						value={values[parameter.name] ?? ''}
						onChange={(event) => onValuesChange({ ...values, [parameter.name]: event.target.value })}
						placeholder={parameter.type === 'date' ? 'YYYY-MM-DD' : 'for Preview'}
						className='h-8 text-xs'
						aria-label='Test value'
					/>
					<Button
						variant='ghost-muted'
						size='icon-sm'
						onClick={() => onChange(parameters.filter((_, i) => i !== index))}
						aria-label={`Remove ${parameter.name}`}
					>
						<Trash2 />
					</Button>
				</div>
			))}
			{missing.length > 0 && (
				<div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
					<span>Placeholders without a parameter:</span>
					{missing.map((name) => (
						<Button
							key={name}
							size='sm'
							variant='outline'
							className='h-6 font-mono text-xs'
							onClick={() => onChange([...parameters, { name, type: 'string', required: true }])}
						>
							+ {name}
						</Button>
					))}
				</div>
			)}
		</div>
	);
}

function parseDefault(type: QueryToolParameterType, raw: string): QueryToolParameter['default'] {
	if (raw === '') {
		return null;
	}
	if (type === 'number' || type === 'integer') {
		const number = Number(raw);
		return Number.isFinite(number) ? number : raw;
	}
	if (type === 'boolean') {
		return raw === 'true' ? true : raw === 'false' ? false : raw;
	}
	return raw;
}
