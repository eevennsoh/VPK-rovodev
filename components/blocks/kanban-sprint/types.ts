export type StatusType = "backlog" | "todo" | "in-progress" | "review" | "done";
export type PriorityType = "low" | "medium" | "high" | "critical";

export interface Task {
	id: string;
	title: string;
	description?: string;
	status: StatusType;
	priority: PriorityType;
	assignee?: {
		name: string;
		avatar?: string;
	};
	storyPoints?: number;
	labels?: string[];
	dueDate?: string;
	progress?: number;
}

export interface SprintMetadata {
	name: string;
	startDate: string;
	endDate: string;
	totalPoints: number;
	completedPoints: number;
	tasksCount: number;
	completedTasks: number;
}
