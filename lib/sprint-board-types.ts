/**
 * Sprint Board Types
 * Data models for kanban-style sprint board with drag-and-drop support
 */

export type Priority = "low" | "medium" | "high" | "critical";

export type ColumnId = "todo" | "in-progress" | "done";

export interface Assignee {
	id: string;
	name: string;
	avatarUrl?: string;
}

export interface Task {
	id: string;
	title: string;
	assignee: Assignee;
	priority: Priority;
	columnId: ColumnId;
	order: number; // For maintaining order within a column
}

export interface Column {
	id: ColumnId;
	title: string;
	taskIds: string[]; // Ordered list of task IDs in this column
}

export interface Sprint {
	id: string;
	name: string;
	startDate: string;
	endDate: string;
	isActive: boolean;
}

export interface SprintBoardState {
	sprints: Sprint[];
	tasks: Record<string, Task>; // Keyed by task ID for fast lookup
	columns: Column[];
	activeSprintId: string | null;
}

/**
 * Helper type for drag-and-drop operations
 */
export interface DragDropResult {
	taskId: string;
	sourceColumnId: ColumnId;
	destinationColumnId: ColumnId;
	sourceIndex: number;
	destinationIndex: number;
}
