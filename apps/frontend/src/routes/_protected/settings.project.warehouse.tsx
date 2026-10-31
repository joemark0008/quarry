import { createFileRoute } from '@tanstack/react-router';
import { WarehouseSettingsPage } from '@/feature/settings/warehouse-page';

export const Route = createFileRoute('/_protected/settings/project/warehouse')({
	staticData: {
		title: 'Warehouse',
	},
	component: WarehouseSettingsPage,
});
