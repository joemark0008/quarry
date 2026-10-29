import eslint from '@eslint/js';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			'simple-import-sort': simpleImportSort,
		},
		rules: {
			'simple-import-sort/imports': 'warn',
			'simple-import-sort/exports': 'warn',
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
			'@typescript-eslint/no-unused-expressions': 'warn',
			curly: 'warn',
		},
	},
	{
		// Node scripts (brand/build.mjs, …).
		files: ['**/*.mjs'],
		languageOptions: {
			globals: { process: 'readonly', Buffer: 'readonly', console: 'readonly', URL: 'readonly' },
		},
	},
	{ ignores: ['**/dist/', '**/node_modules/', '**/src/generated/', 'apps/frontend/', '.claude/'] },
);
