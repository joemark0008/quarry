import { Slider } from '@mantine/core';
import type { ToolCallDensity } from '@quarry/shared/types';
import { cn } from '@/lib/utils';

const densityOptions: { value: ToolCallDensity; label: string }[] = [
	{ value: 'compact', label: 'Compact' },
	{ value: 'detailed', label: 'Detailed' },
];

export const ToolCallDensitySlider = ({
	value,
	onValueChange,
	disabled = false,
}: {
	value: ToolCallDensity;
	onValueChange: (value: ToolCallDensity) => void;
	disabled?: boolean;
}) => {
	const selectedIndex = densityOptions.findIndex((option) => option.value === value);

	return (
		<div className='flex w-44 flex-col gap-1.5'>
			<Slider
				value={selectedIndex}
				onChange={(index) => onValueChange(densityOptions[index].value)}
				min={0}
				max={densityOptions.length - 1}
				step={1}
				disabled={disabled}
				label={null}
				size='sm'
				thumbLabel='Tool call density'
			/>
			<div className='flex justify-between text-xs'>
				{densityOptions.map((option) => (
					<button
						key={option.value}
						type='button'
						onClick={() => onValueChange(option.value)}
						disabled={disabled}
						className={cn(
							'transition-colors',
							disabled ? 'cursor-default opacity-60' : 'cursor-pointer hover:text-foreground',
							option.value === value ? 'font-medium text-foreground' : 'text-muted-foreground',
						)}
					>
						{option.label}
					</button>
				))}
			</div>
		</div>
	);
};
