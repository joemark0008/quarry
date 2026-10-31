import { Editor, useMonaco } from '@monaco-editor/react';
import { useEffect, useState } from 'react';

import { useEditorTheme } from '@/hooks/use-editor-theme';
import { SQL_SHIKI_THEME, setupSqlHighlighting } from '@/lib/sql-shiki-theme';
import styles from './query-tool-sql-editor.module.css';

/** The Monaco SQL editor of the chat's side panel (same highlighting), as a plain controlled field. */
export function QueryToolSqlEditor({
	value,
	onChange,
	onRun,
	readOnly = false,
}: {
	value: string;
	onChange: (value: string) => void;
	/** ⌘↵ / Ctrl+↵ inside the editor. */
	onRun?: () => void;
	readOnly?: boolean;
}) {
	const monaco = useMonaco();
	const editorTheme = useEditorTheme();
	const [shikiReady, setShikiReady] = useState(false);

	useEffect(() => {
		if (!monaco) {
			return;
		}
		let active = true;
		setupSqlHighlighting(monaco).then(() => {
			if (active) {
				setShikiReady(true);
			}
		});
		return () => {
			active = false;
		};
	}, [monaco]);

	const themeName = shikiReady
		? editorTheme === 'vs-dark'
			? SQL_SHIKI_THEME.dark
			: SQL_SHIKI_THEME.light
		: editorTheme;

	return (
		<div className={styles.queryToolSqlEditorDiv} data-testid='query-tool-sql-editor'>
			<Editor
				value={value}
				onChange={(next) => onChange(next ?? '')}
				onMount={(instance, monacoInstance) => {
					if (onRun) {
						instance.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter, onRun);
					}
				}}
				language='sql'
				theme={themeName}
				options={{
					readOnly,
					minimap: { enabled: false },
					folding: false,
					lineNumbers: 'on',
					scrollBeyondLastLine: false,
					padding: { top: 12, bottom: 12 },
					wordWrap: 'on',
					fontSize: 13,
				}}
			/>
		</div>
	);
}
