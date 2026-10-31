import { Loader2Icon } from 'lucide-react';

import { cn } from '@/lib/utils';
import styles from './spinner.module.css';

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
	return (
		<Loader2Icon
			role='status'
			aria-label='Loading'
			className={cn(styles.spinnerLoader2Icon, className)}
			{...props}
		/>
	);
}

export { Spinner };
