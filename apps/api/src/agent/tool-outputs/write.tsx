import type { writeFile } from '@quarry/shared/tools';

import { Block } from '../markdown/index.js';
import { formatSize } from '../utils/utils.js';

export const WriteOutput = ({ output }: { output: writeFile.Output }) => {
	return <Block>{`Saved ${output.path} (${formatSize(output.size)}).`}</Block>;
};
