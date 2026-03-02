/**
 * Sprint Board Sample Data
 * Provides initial/demo data for the sprint board
 */

import type { Sprint, Task, Column, SprintBoardState, Assignee } from "./sprint-board-types";

// Sample team members
export const SAMPLE_ASSIGNEES: Assignee[] = [
	{
		id: "user-1",
		name: "Andrea Wilson",
		avatarUrl: "/avatar-human/andrea-wilson.png",
	},
	{
		id: "user-2",
		name: "Raul Gonzalez",
		avatarUrl: "/avatar-human/raul-gonzalez.png",
	},
	{
		id: "user-3",
		name: "Priya Hansra",
		avatarUrl: "/avatar-human/priya-hansra.png",
	},
	{
		id: "user-4",
		name: "Maia Ma",
		avatarUrl: "/avatar-human/maia-ma.png",
	},
	{
		id: "user-5",
		name: "Austin Lambert",
		avatarUrl: "/avatar-human/austin-lambert.png",
	},
];

// Sample sprints
export const SAMPLE_SPRINTS: Sprint[] = [
	{
		id: "sprint-1",
		name: "Sprint 24 - Q1 Foundation",
		startDate: "2026-02-17",
		endDate: "2026-03-03",
		isActive: true,
	},
	{
		id: "sprint-2",
		name: "Sprint 23 - Authentication",
		startDate: "2026-02-03",
		endDate: "2026-02-16",
		isActive: false,
	},
	{
		id: "sprint-3",
		name: "Sprint 22 - UI Components",
		startDate: "2026-01-20",
		endDate: "2026-02-02",
		isActive: false,
	},
];

// Sample tasks for Sprint 24 (active sprint)
export const SAMPLE_TASKS_SPRINT_24: Task[] = [
	// To Do column
	{
		id: "task-1",
		title: "Implement dark mode toggle",
		assignee: SAMPLE_ASSIGNEES[3],
		priority: "low",
		columnId: "todo",
		order: 0,
	},
	{
		id: "task-2",
		title: "Add analytics tracking events",
		assignee: SAMPLE_ASSIGNEES[4],
		priority: "medium",
		columnId: "todo",
		order: 1,
	},
	{
		id: "task-3",
		title: "Implement user profile settings page",
		assignee: SAMPLE_ASSIGNEES[0],
		priority: "high",
		columnId: "todo",
		order: 2,
	},
	{
		id: "task-4",
		title: "Fix navigation menu on mobile devices",
		assignee: SAMPLE_ASSIGNEES[2],
		priority: "critical",
		columnId: "todo",
		order: 3,
	},

	// In Progress column
	{
		id: "task-5",
		title: "Integrate payment gateway",
		assignee: SAMPLE_ASSIGNEES[0],
		priority: "critical",
		columnId: "in-progress",
		order: 0,
	},
	{
		id: "task-6",
		title: "Refactor authentication middleware",
		assignee: SAMPLE_ASSIGNEES[4],
		priority: "high",
		columnId: "in-progress",
		order: 1,
	},
	{
		id: "task-7",
		title: "Design new landing page layout",
		assignee: SAMPLE_ASSIGNEES[1],
		priority: "medium",
		columnId: "in-progress",
		order: 2,
	},

	// Done column
	{
		id: "task-8",
		title: "Set up CI/CD pipeline",
		assignee: SAMPLE_ASSIGNEES[2],
		priority: "high",
		columnId: "done",
		order: 0,
	},
	{
		id: "task-9",
		title: "Create reusable button components",
		assignee: SAMPLE_ASSIGNEES[3],
		priority: "medium",
		columnId: "done",
		order: 1,
	},
	{
		id: "task-10",
		title: "Write unit tests for user service",
		assignee: SAMPLE_ASSIGNEES[4],
		priority: "medium",
		columnId: "done",
		order: 2,
	},
];

// Sample tasks for Sprint 23
export const SAMPLE_TASKS_SPRINT_23: Task[] = [
	{
		id: "task-23-1",
		title: "Implement JWT authentication",
		assignee: SAMPLE_ASSIGNEES[0],
		priority: "critical",
		columnId: "done",
		order: 0,
	},
	{
		id: "task-23-2",
		title: "Add OAuth2 provider integration",
		assignee: SAMPLE_ASSIGNEES[1],
		priority: "high",
		columnId: "done",
		order: 1,
	},
	{
		id: "task-23-3",
		title: "Create login and signup forms",
		assignee: SAMPLE_ASSIGNEES[2],
		priority: "high",
		columnId: "done",
		order: 2,
	},
	{
		id: "task-23-4",
		title: "Implement password reset flow",
		assignee: SAMPLE_ASSIGNEES[3],
		priority: "medium",
		columnId: "done",
		order: 3,
	},
];

// Default column structure
export const DEFAULT_COLUMNS: Column[] = [
	{
		id: "todo",
		title: "To Do",
		taskIds: [],
	},
	{
		id: "in-progress",
		title: "In Progress",
		taskIds: [],
	},
	{
		id: "done",
		title: "Done",
		taskIds: [],
	},
];

/**
 * Generate initial board state from sample data
 */
export function getInitialBoardState(): SprintBoardState {
	const tasks: Record<string, Task> = {};

	// Add Sprint 24 tasks
	SAMPLE_TASKS_SPRINT_24.forEach((task) => {
		tasks[task.id] = task;
	});

	// Add Sprint 23 tasks
	SAMPLE_TASKS_SPRINT_23.forEach((task) => {
		tasks[task.id] = task;
	});

	// Build column task IDs for active sprint (Sprint 24)
	const columns: Column[] = DEFAULT_COLUMNS.map((col) => {
		const columnTasks = SAMPLE_TASKS_SPRINT_24.filter((task) => task.columnId === col.id).sort(
			(a, b) => a.order - b.order,
		);
		return {
			...col,
			taskIds: columnTasks.map((task) => task.id),
		};
	});

	return {
		sprints: SAMPLE_SPRINTS,
		tasks,
		columns,
		activeSprintId: "sprint-1",
	};
}

/**
 * Helper to get tasks for a specific sprint
 */
export function getTasksForSprint(sprintId: string, allTasks: Record<string, Task>): Task[] {
	// In a real app, tasks would have a sprintId field
	// For demo purposes, we'll map sprints to their task sets
	const sprintTaskMap: Record<string, string[]> = {
		"sprint-1": SAMPLE_TASKS_SPRINT_24.map((t) => t.id),
		"sprint-2": SAMPLE_TASKS_SPRINT_23.map((t) => t.id),
		"sprint-3": [], // Empty sprint for demo
	};

	const taskIds = sprintTaskMap[sprintId] || [];
	return taskIds.map((id) => allTasks[id]).filter(Boolean);
}
