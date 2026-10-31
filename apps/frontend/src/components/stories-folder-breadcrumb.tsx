import { ChevronRight, Lock } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from './stories-folder-breadcrumb.module.css';

export type BreadcrumbNode = { id: string | null; name: string; isPrivate?: boolean };

export function FolderBreadcrumb({ path, rootIcon }: { path: BreadcrumbNode[]; rootIcon: LucideIcon }) {
	const root = path[0];
	const rest = path.slice(1);
	const rootIsLast = rest.length === 0;

	return (
		<nav aria-label='Folder navigation' className={styles.folderBreadcrumbNav}>
			<span className={styles.folderBreadcrumbSpan}>
				<DroppableCrumb node={root} isLast={rootIsLast} rootIcon={rootIcon} />
				{!rootIsLast && <ChevronRight className={styles.folderBreadcrumbChevronRight} />}
			</span>

			{rest.length > 0 && (
				<span className={styles.folderBreadcrumbSpan2}>
					{rest.map((node, index) => {
						const isLast = index === rest.length - 1;
						return (
							<span key={node.id} className={styles.folderBreadcrumbNav}>
								{index > 0 && <ChevronRight className={styles.folderBreadcrumbChevronRight} />}
								<span className={cn(!isLast && styles.folderBreadcrumbSpan3)}>
									<DroppableCrumb node={node} isLast={isLast} rootIcon={rootIcon} />
								</span>
							</span>
						);
					})}
				</span>
			)}
		</nav>
	);
}

function DroppableCrumb({
	node,
	isLast,
	rootIcon: RootIcon,
}: {
	node: BreadcrumbNode;
	isLast: boolean;
	rootIcon: LucideIcon;
}) {
	const droppableId = node.id === null ? 'drop-folder-root' : `drop-folder-${node.id}`;
	const { active } = useDndContext();
	const activeData = active?.data.current as { type?: string; isOwnedByUser?: boolean } | undefined;
	const blockPrivateDrop = node.isPrivate && activeData?.type === 'story' && activeData?.isOwnedByUser === false;
	const { setNodeRef, isOver } = useDroppable({ id: droppableId, disabled: blockPrivateDrop });

	const inner = (
		<span
			ref={setNodeRef}
			className={cn(
				styles.innerSpan,
				isOver && styles.innerSpan2,
				isLast ? styles.innerSpan3 : styles.innerSpan4,
				node.id === null ? styles.innerSpan5 : '',
			)}
		>
			{node.id === null ? <RootIcon className={styles.innerRootIcon} /> : node.name}
			{node.isPrivate && <Lock className={styles.innerLock} />}
		</span>
	);

	if (isLast) {
		return inner;
	}

	return (
		<Link to='/stories' search={{ folderId: node.id }}>
			{inner}
		</Link>
	);
}
