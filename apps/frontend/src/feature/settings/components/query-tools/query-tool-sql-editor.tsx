import { Editor, useMonaco } from '@monaco-editor/react';
import { useEffect, useRef, useState } from 'react';

import styles from './query-tool-sql-editor.module.css';
import type { editor } from 'monaco-editor';
import { useEditorTheme } from '@/hooks/use-editor-theme';
import { SQL_SHIKI_THEME, setupSqlHighlighting } from '@/lib/sql-shiki-theme';

/** Replaces the editor's text as an edit, so ⌘Z brings the earlier text back. */
function replaceText(instance: editor.IStandaloneCodeEditor, text: string) {
	const model = instance.getModel();
	if (!model || instance.getValue() === text) {
		return;
	}
	instance.executeEdits('query-tool-sql-editor', [
		{ range: model.getFullModelRange(), text, forceMoveMarkers: true },
	]);
	instance.pushUndoStop();
}

/**
 * The Monaco SQL editor of the chat's side panel (same highlighting), as a controlled field.
 * Monaco owns the text while the user types: `value` only reaches it when it is a change from outside. Passing it as
 * Editor's `value` would write a render that lags behind the keyboard back over newer keystrokes.
 */
export function QueryToolSqlEditor({
	value,
	onChange,
	onRun,
	onReady,
	readOnly = false,
}: {
	value: string;
	onChange: (value: string) => void;
	/** ⌘↵ / Ctrl+↵ inside the editor. */
	onRun?: () => void;
	/** The Monaco instance, for inserting text at the cursor. */
	onReady?: (instance: editor.IStandaloneCodeEditor) => void;
	readOnly?: boolean;
}) {
	const monaco = useMonaco();
	const editorTheme = useEditorTheme();
	const [shikiReady, setShikiReady] = useState(false);
	const instanceRef = useRef<editor.IStandaloneCodeEditor | null>(null);
	const valueRef = useRef(value);
	valueRef.current = value;
	/** What the editor reported and `value` hasn't come back with yet, oldest first. */
	const pendingValues = useRef<string[]>([]);

	useEffect(() => {
		const pendingIndex = pendingValues.current.indexOf(value);
		if (pendingIndex >= 0) {
			pendingValues.current.splice(0, pendingIndex + 1);
			return;
		}
		pendingValues.current = [];
		if (instanceRef.current) {
			replaceText(instanceRef.current, value);
		}
	}, [value]);

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
				defaultValue={value}
				onChange={(next) => {
					const text = next ?? '';
					pendingValues.current.push(text);
					onChange(text);
				}}
				onMount={(instance, monacoInstance) => {
					instanceRef.current = instance;
					replaceText(instance, valueRef.current);
					onReady?.(instance);
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
