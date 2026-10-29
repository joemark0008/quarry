import type { strReplace } from '@quarry/shared/tools';

import { Block } from '../markdown/index.js';
import { formatSize } from '../utils/utils.js';

export const StrReplaceOutput = ({ output }: { output: strReplace.Output }) => {
	const occurrences = output.replacements === 1 ? '1 occurrence' : `${output.replacements} occurrences`;
	return <Block>{`Edited ${output.path} (${occurrences} replaced, now ${formatSize(output.size)}).`}</Block>;
};
