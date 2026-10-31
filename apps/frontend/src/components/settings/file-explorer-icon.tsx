import {
	IconBraces,
	IconBrandCss3,
	IconBrandDocker,
	IconBrandHtml5,
	IconBrandJavascript,
	IconBrandPython,
	IconBrandTypescript,
	IconCode,
	IconDatabase,
	IconFile,
	IconFileDatabase,
	IconFileText,
	IconFolder,
	IconGitBranch,
	IconLock,
	IconLogs,
	IconMarkdown,
	IconNotebook,
	IconSettingsCode,
	IconSql,
	IconTable,
	IconTerminal2,
} from '@tabler/icons-react';

import { cn } from '@/lib/utils';
import styles from './file-explorer-icon.module.css';

interface FileExplorerIconProps {
	name: string;
	type: 'file' | 'directory' | 'table';
	className?: string;
}

type IconDefinition = {
	icon: typeof IconFile;
	color: string;
};

const FOLDER_ICON: IconDefinition = {
	icon: IconFolder,
	color: styles.fOLDERICONColor,
};

const TABLE_ICON: IconDefinition = {
	icon: IconTable,
	color: styles.tABLEICONColor,
};

const FILE_NAME_ICONS: Record<string, IconDefinition> = {
	'.gitattributes': { icon: IconGitBranch, color: styles.fILENAMEICONSColor },
	'.gitignore': { icon: IconGitBranch, color: styles.fILENAMEICONSColor },
	'.prettierignore': { icon: IconSettingsCode, color: styles.fILENAMEICONSColor2 },
	'.prettierrc': { icon: IconSettingsCode, color: styles.fILENAMEICONSColor2 },
	dockerfile: { icon: IconBrandDocker, color: styles.fILENAMEICONSColor3 },
	'quarry_config.yaml': { icon: IconSettingsCode, color: styles.fILENAMEICONSColor2 },
	'pyproject.toml': { icon: IconSettingsCode, color: styles.fILENAMEICONSColor2 },
};

const EXTENSION_ICONS: Record<string, IconDefinition> = {
	'.bash': { icon: IconTerminal2, color: styles.tABLEICONColor },
	'.cjs': { icon: IconBrandJavascript, color: styles.eXTENSIONICONSColor },
	'.css': { icon: IconBrandCss3, color: styles.eXTENSIONICONSColor2 },
	'.csv': { icon: IconTable, color: styles.tABLEICONColor },
	'.cts': { icon: IconBrandTypescript, color: styles.fOLDERICONColor },
	'.db': { icon: IconDatabase, color: styles.eXTENSIONICONSColor3 },
	'.duckdb': { icon: IconDatabase, color: styles.eXTENSIONICONSColor3 },
	'.fish': { icon: IconTerminal2, color: styles.tABLEICONColor },
	'.html': { icon: IconBrandHtml5, color: styles.fILENAMEICONSColor },
	'.htm': { icon: IconBrandHtml5, color: styles.fILENAMEICONSColor },
	'.ipynb': { icon: IconNotebook, color: styles.fILENAMEICONSColor },
	'.js': { icon: IconBrandJavascript, color: styles.eXTENSIONICONSColor },
	'.json': { icon: IconBraces, color: styles.getNamedFileIconColor },
	'.jsx': { icon: IconBrandJavascript, color: styles.eXTENSIONICONSColor },
	'.less': { icon: IconBrandCss3, color: styles.eXTENSIONICONSColor2 },
	'.lock': { icon: IconLock, color: styles.getNamedFileIconColor },
	'.log': { icon: IconLogs, color: styles.eXTENSIONICONSColor4 },
	'.markdown': { icon: IconMarkdown, color: styles.fOLDERICONColor },
	'.md': { icon: IconMarkdown, color: styles.fOLDERICONColor },
	'.mdc': { icon: IconMarkdown, color: styles.fOLDERICONColor },
	'.mdx': { icon: IconMarkdown, color: styles.fOLDERICONColor },
	'.mjs': { icon: IconBrandJavascript, color: styles.eXTENSIONICONSColor },
	'.mts': { icon: IconBrandTypescript, color: styles.fOLDERICONColor },
	'.parquet': { icon: IconFileDatabase, color: styles.eXTENSIONICONSColor5 },
	'.ps1': { icon: IconTerminal2, color: styles.tABLEICONColor },
	'.py': { icon: IconBrandPython, color: styles.eXTENSIONICONSColor },
	'.pyi': { icon: IconBrandPython, color: styles.eXTENSIONICONSColor },
	'.sass': { icon: IconBrandCss3, color: styles.eXTENSIONICONSColor2 },
	'.scss': { icon: IconBrandCss3, color: styles.eXTENSIONICONSColor2 },
	'.sh': { icon: IconTerminal2, color: styles.tABLEICONColor },
	'.sql': { icon: IconSql, color: styles.fILENAMEICONSColor3 },
	'.sqlite': { icon: IconDatabase, color: styles.eXTENSIONICONSColor3 },
	'.sqlite3': { icon: IconDatabase, color: styles.eXTENSIONICONSColor3 },
	'.toml': { icon: IconSettingsCode, color: styles.fILENAMEICONSColor2 },
	'.ts': { icon: IconBrandTypescript, color: styles.fOLDERICONColor },
	'.tsv': { icon: IconTable, color: styles.tABLEICONColor },
	'.tsx': { icon: IconBrandTypescript, color: styles.fOLDERICONColor },
	'.txt': { icon: IconFileText, color: styles.eXTENSIONICONSColor6 },
	'.yaml': { icon: IconSettingsCode, color: styles.fILENAMEICONSColor2 },
	'.yml': { icon: IconSettingsCode, color: styles.fILENAMEICONSColor2 },
	'.zsh': { icon: IconTerminal2, color: styles.tABLEICONColor },
};

const CONFIG_EXTENSIONS = new Set(['.cfg', '.conf', '.config', '.ini']);
const TEXT_EXTENSIONS = new Set(['.rst', '.text']);
const CODE_EXTENSIONS = new Set([
	'.c',
	'.cc',
	'.cpp',
	'.cs',
	'.go',
	'.h',
	'.hpp',
	'.java',
	'.kt',
	'.lua',
	'.php',
	'.r',
	'.rb',
	'.rs',
	'.scala',
	'.svg',
	'.swift',
	'.vue',
	'.xml',
]);

export function FileExplorerIcon({ name, type, className }: FileExplorerIconProps) {
	const definition = type === 'directory' ? FOLDER_ICON : type === 'table' ? TABLE_ICON : getFileIconDefinition(name);
	const Icon = definition.icon;

	return (
		<Icon
			aria-hidden='true'
			focusable='false'
			stroke={1.5}
			className={cn(styles.fileExplorerIconIcon, definition.color, className)}
		/>
	);
}

function getFileIconDefinition(name: string): IconDefinition {
	const lowerName = name.toLowerCase();
	const namedIcon = getNamedFileIcon(lowerName);
	if (namedIcon) {
		return namedIcon;
	}

	const dotIndex = lowerName.lastIndexOf('.');
	const extension = dotIndex === -1 ? '' : lowerName.slice(dotIndex);
	if (EXTENSION_ICONS[extension]) {
		return EXTENSION_ICONS[extension];
	}
	if (CONFIG_EXTENSIONS.has(extension)) {
		return { icon: IconSettingsCode, color: styles.fILENAMEICONSColor2 };
	}
	if (TEXT_EXTENSIONS.has(extension)) {
		return { icon: IconFileText, color: styles.eXTENSIONICONSColor6 };
	}
	if (CODE_EXTENSIONS.has(extension)) {
		return { icon: IconCode, color: styles.getFileIconDefinitionColor };
	}
	return { icon: IconFile, color: styles.eXTENSIONICONSColor6 };
}

function getNamedFileIcon(name: string): IconDefinition | undefined {
	if (FILE_NAME_ICONS[name]) {
		return FILE_NAME_ICONS[name];
	}
	if (name === '.env' || name.startsWith('.env.')) {
		return { icon: IconLock, color: styles.getNamedFileIconColor };
	}
	if (name.startsWith('dockerfile.')) {
		return { icon: IconBrandDocker, color: styles.fILENAMEICONSColor3 };
	}
	if (name.includes('.config.') || name.endsWith('config.json') || (name.startsWith('.') && name.endsWith('rc'))) {
		return { icon: IconSettingsCode, color: styles.fILENAMEICONSColor2 };
	}
	return undefined;
}
