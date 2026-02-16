export interface WorkItemsData {
	items: {
		key: string;
		summary: string;
		status: string;
		dueDate?: string;
		priority?: "High" | "Medium" | "Low";
	}[];
	assignedTo?: string;
}
