// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QueryToolSqlEditor } from './query-tool-sql-editor';

const editor = vi.hoisted(() => ({
	text: '',
	onChange: undefined as ((value: string) => void) | undefined,
	getValue: () => editor.text,
	getModel: () => ({ getFullModelRange: () => 'whole', setEOL: vi.fn() }),
	addCommand: vi.fn(),
	pushUndoStop: vi.fn(),
	executeEdits: vi.fn((_source: string, edits: { text: string }[]) => {
		editor.text = edits[0].text;
		// Monaco reports every content change, including edits from code.
		editor.onChange?.(edits[0].text);
	}),
	/** A keystroke: Monaco changes its text, then reports it. */
	type: (text: string) => {
		editor.text = text;
		editor.onChange?.(text);
	},
}));

vi.mock('@monaco-editor/react', () => ({
	useMonaco: () => null,
	Editor: ({
		defaultValue,
		onChange,
		onMount,
	}: {
		defaultValue: string;
		onChange: (value: string) => void;
		onMount: (instance: unknown, monaco: unknown) => void;
	}) => {
		editor.onChange = onChange;
		useEffect(() => {
			editor.text = defaultValue;
			onMount(editor, {
				KeyMod: { CtrlCmd: 0 },
				KeyCode: { Enter: 0 },
				editor: { EndOfLineSequence: { LF: 0 } },
			});
			// Monaco mounts once.
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, []);
		return null;
	},
}));
vi.mock('@/hooks/use-editor-theme', () => ({ useEditorTheme: () => 'vs' }));
vi.mock('@/lib/sql-shiki-theme', () => ({ SQL_SHIKI_THEME: {}, setupSqlHighlighting: vi.fn() }));

const field = (value: string) => <QueryToolSqlEditor value={value} onChange={vi.fn()} />;

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe('QueryToolSqlEditor', () => {
	it('keeps keystrokes that are newer than a lagging value', () => {
		const { rerender } = render(field(''));
		editor.type('S');
		editor.type('SE');
		editor.type('SEL');

		rerender(field('S'));
		rerender(field('SEL'));

		expect(editor.text).toBe('SEL');
		expect(editor.executeEdits).not.toHaveBeenCalled();
	});

	it('applies a change from outside as an undoable edit', () => {
		const { rerender } = render(field(''));
		editor.type('SELECT 1');
		rerender(field('SELECT 1'));

		rerender(field('SELECT 2'));

		expect(editor.text).toBe('SELECT 2');
		expect(editor.pushUndoStop).toHaveBeenCalled();
	});

	it('can go back to an earlier value from outside', () => {
		const { rerender } = render(field('saved'));
		editor.type('edited');
		rerender(field('edited'));

		rerender(field('saved'));

		expect(editor.text).toBe('saved');
	});

	it('applies the same value again after the user changed it', () => {
		const { rerender } = render(field(''));
		rerender(field('SELECT 1'));
		expect(editor.text).toBe('SELECT 1');

		editor.type('SELECT 1 edited');
		rerender(field('SELECT 1 edited'));
		rerender(field('SELECT 1'));

		expect(editor.text).toBe('SELECT 1');
	});

	it('reports plain line endings, whatever Monaco uses', () => {
		const onChange = vi.fn();
		render(<QueryToolSqlEditor value='' onChange={onChange} />);
		editor.type('SELECT 1\r\nFROM t');
		expect(onChange).toHaveBeenCalledWith('SELECT 1\nFROM t');
	});

	it('leaves the editor alone when only the line endings differ', () => {
		render(field('a\nb'));
		const before = editor.executeEdits.mock.calls.length;
		editor.text = 'a\r\nb';
		cleanup();
		render(field('a\nb'));
		expect(editor.executeEdits.mock.calls.length).toBe(before);
	});

	it('starts with the value', () => {
		render(field('SELECT 1'));
		expect(editor.text).toBe('SELECT 1');
	});
});
