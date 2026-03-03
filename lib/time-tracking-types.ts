/**
 * Time Tracking Types
 * Data models for a task-list time tracking app with daily and weekly views.
 * Users track hours per task/project per day in a table layout.
 */

export type ViewMode = "daily" | "weekly";

// ── Project ──────────────────────────────────────────────────────────────

export interface Project {
	id: string;
	name: string;
	color: string; // Tailwind-compatible color class (e.g. "bg-[#1D7AFC]")
}

// ── Task ─────────────────────────────────────────────────────────────────

export interface Task {
	id: string;
	name: string;
	projectId: string;
	/** Optional Jira issue key (e.g. "ATLAS-1234") */
	issueKey?: string;
	/** Optional Jira issue URL */
	issueUrl?: string;
}

// ── Time Entry ───────────────────────────────────────────────────────────

export interface TimeEntry {
	id: string;
	taskId: string;
	projectId: string;
	date: string; // ISO date string (YYYY-MM-DD)
	hours: number; // Duration in hours (0.5 increments)
}

// ── Grouped row used by table views ──────────────────────────────────────

/** A project header row with its child task rows, used by the table views. */
export interface ProjectGroup {
	project: Project;
	tasks: Task[];
	/** Whether the project group is expanded (shows individual tasks). */
	expanded: boolean;
}

// ── Timer ─────────────────────────────────────────────────────────────────

/** Tracks a running timer for a single task. Only one timer can be active at a time. */
export interface ActiveTimer {
	taskId: string;
	projectId: string;
	/** ISO timestamp when the timer was started. */
	startedAt: string;
}

// ── Application state ────────────────────────────────────────────────────

export interface TimeTrackingState {
	entries: TimeEntry[];
	projects: Project[];
	tasks: Task[];
	viewMode: ViewMode;
	selectedDate: string; // ISO date string for current day/week anchor
	weeklyTargetHours: number;
	/** Track which project groups are expanded in the table view. */
	expandedProjects: Record<string, boolean>;
	/** Currently running timer (only one at a time). */
	activeTimer: ActiveTimer | null;
}
