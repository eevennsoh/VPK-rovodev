import { InventoryDashboard } from "@/components/templates/inventory/inventory-dashboard";

export const metadata = {
	title: "Inventory Tracker",
	description: "Track warehouse inventory, stock levels, and activity",
};

export default function InventoryPage() {
	return <InventoryDashboard />;
}
