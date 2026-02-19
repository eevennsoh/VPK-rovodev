export type WorkItemType = "Story" | "Task" | "Bug" | "Epic" | "Subtask";
export type WorkItemStatus = "To Do" | "In Progress" | "In Review" | "Done" | "Closed";
export type PriorityLevel = "Low" | "Medium" | "High" | "Critical";

export interface WorkItem {
	key: string;
	title: string;
	description: string;
	type: WorkItemType;
	status: WorkItemStatus;
	priority: PriorityLevel;
	assignee: {
		name: string;
		avatar: string;
		initials: string;
		role: string;
	};
	reporter: string;
	created: string;
	updated: string;
	dueDate?: string;
	labels?: string[];
	storyPoints?: number;
	estimatedHours?: number;
	components?: string[];
}

export interface Comment {
	id: string;
	author: {
		name: string;
		avatar: string;
		initials: string;
	};
	text: string;
	timestamp: string;
	likes: number;
}

export interface LinkedItem {
	key: string;
	title: string;
	type: "relates to" | "blocks" | "is blocked by" | "duplicates" | "is duplicated by";
	status: WorkItemStatus;
}
