export interface WorkItem {
	key: string;
	summary: string;
	status: string;
	dueDate?: string;
	priority?: "High" | "Medium" | "Low";
}

export interface WorkItemsData {
	items: WorkItem[];
	assignedTo?: string;
}
