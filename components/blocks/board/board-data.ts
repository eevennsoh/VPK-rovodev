/**
 * Board Data & Types
 * Simple 3-column sprint board with in-memory sample data
 */

export type Priority = "low" | "medium" | "high" | "critical";

export type BoardColumnId = "todo" | "in-progress" | "done";

export interface BoardAssignee {
	name: string;
	avatarUrl: string;
}

export interface BoardTask {
	id: string;
	title: string;
	assignee: BoardAssignee;
	priority: Priority;
}

export interface BoardColumnDef {
	id: BoardColumnId;
	title: string;
}

export interface BoardState {
	columns: Record<BoardColumnId, string[]>; // column ID → ordered task IDs
	tasks: Record<string, BoardTask>; // task ID → task
}

// ── Column definitions ──────────────────────────────────────────────────────

export const BOARD_COLUMNS: BoardColumnDef[] = [
	{ id: "todo", title: "To Do" },
	{ id: "in-progress", title: "In Progress" },
	{ id: "done", title: "Done" },
];

// ── Sample assignees ────────────────────────────────────────────────────────

const ASSIGNEES: BoardAssignee[] = [
	{ name: "Andrea Wilson", avatarUrl: "/avatar-human/andrea-wilson.png" },
	{ name: "Andrew Park", avatarUrl: "/avatar-human/andrew-park.png" },
	{ name: "Annie Clare", avatarUrl: "/avatar-human/annie-clare.png" },
	{ name: "Darius Pavri", avatarUrl: "/avatar-human/darius-pavri.png" },
	{ name: "Olivia Yang", avatarUrl: "/avatar-human/olivia-yang.png" },
	{ name: "Priya Hansra", avatarUrl: "/avatar-human/priya-hansra.png" },
];

// ── Sample tasks ────────────────────────────────────────────────────────────

const SAMPLE_TASKS: BoardTask[] = [
	// To Do
	{
		id: "board-1",
		title: "Set up CI/CD pipeline for staging environment",
		assignee: ASSIGNEES[0],
		priority: "high",
	},
	{
		id: "board-2",
		title: "Write unit tests for authentication service",
		assignee: ASSIGNEES[1],
		priority: "medium",
	},
	{
		id: "board-3",
		title: "Update onboarding flow copy",
		assignee: ASSIGNEES[2],
		priority: "low",
	},
	{
		id: "board-4",
		title: "Fix navigation menu on mobile devices",
		assignee: ASSIGNEES[3],
		priority: "critical",
	},

	// In Progress
	{
		id: "board-5",
		title: "Integrate payment gateway API",
		assignee: ASSIGNEES[0],
		priority: "critical",
	},
	{
		id: "board-6",
		title: "Design new dashboard layout",
		assignee: ASSIGNEES[4],
		priority: "medium",
	},
	{
		id: "board-7",
		title: "Refactor user profile settings page",
		assignee: ASSIGNEES[5],
		priority: "high",
	},

	// Done
	{
		id: "board-8",
		title: "Add dark mode toggle to settings",
		assignee: ASSIGNEES[3],
		priority: "low",
	},
	{
		id: "board-9",
		title: "Create reusable button component library",
		assignee: ASSIGNEES[1],
		priority: "medium",
	},
	{
		id: "board-10",
		title: "Implement search functionality",
		assignee: ASSIGNEES[4],
		priority: "high",
	},
	{
		id: "board-11",
		title: "Set up error tracking with Sentry",
		assignee: ASSIGNEES[2],
		priority: "medium",
	},
	{
		id: "board-12",
		title: "Migrate database schema to v2",
		assignee: ASSIGNEES[5],
		priority: "critical",
	},
];

// ── Initial state factory ───────────────────────────────────────────────────

export function getInitialBoardState(): BoardState {
	const tasks: Record<string, BoardTask> = {};
	for (const task of SAMPLE_TASKS) {
		tasks[task.id] = task;
	}

	return {
		columns: {
			"todo": ["board-1", "board-2", "board-3", "board-4"],
			"in-progress": ["board-5", "board-6", "board-7"],
			"done": ["board-8", "board-9", "board-10", "board-11", "board-12"],
		},
		tasks,
	};
}
