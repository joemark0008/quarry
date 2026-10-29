/** Stand-in for upstream `services/file-text.ts` (PDF and workbook text extraction arrives with Phase 2d). */
export const toReadableText = async (name: string, _data: Buffer): Promise<string> => {
	throw new Error(`Reading ${name} as text is not available yet: only text files can be read.`);
};
