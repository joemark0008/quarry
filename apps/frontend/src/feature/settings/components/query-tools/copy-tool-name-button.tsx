import { Check, Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

/** Copies a query tool's agent name (`qt_<name>`), to paste into a skill or a chat message. */
export function CopyToolNameButton({ name }: { name: string }) {
	const { isCopied, copy } = useCopyToClipboard();
	return (
		<Button
			variant='ghost-muted'
			size='icon-xs'
			onClick={() => copy(name)}
			title={isCopied ? 'Copied' : `Copy ${name}`}
			aria-label={isCopied ? `Copied ${name}` : `Copy ${name}`}
		>
			{isCopied ? <Check /> : <Copy />}
		</Button>
	);
}
