/**
 * Time Tracking Sample Data
 * Provides initial/demo data for the task-list time tracking app.
 */

import {
	startOfWeek,
	addDays,
	format,
	parseISO,
	isSameDay,
	isSameWeek,
	eachDayOfInterval,
	endOfWeek,
} from "date-fns";
import type {
	Project,
	Task,
	TimeEntry,
	TimeTrackingState,
	ProjectGroup,
} from "./time-tracking-types";

// ── Projects ──────────────────────────────────────────────────────────────

export const PROJECTS: Project[] = [
	{ id: "proj-1", name: "Atlas Platform", color: "bg-[#1D7AFC]" },
	{ id: "proj-2", name: "Design System", color: "bg-[#8270DB]" },
	{ id: "proj-3", name: "API Integration", color: "bg-[#22A06B]" },
	{ id: "proj-4", name: "Documentation", color: "bg-[#E56910]" },
	{ id: "proj-5", name: "Meetings", color: "bg-[#E34935]" },
];

// ── Tasks ─────────────────────────────────────────────────────────────────

export const TASKS: Task[] = [
	// Atlas Platform
	{ id: "task-1", name: "Frontend build", projectId: "proj-1", issueKey: "ATLAS-142", issueUrl: "/jira" },
	{ id: "task-2", name: "Backend services", projectId: "proj-1", issueKey: "ATLAS-198", issueUrl: "/jira" },
	{ id: "task-3", name: "Performance testing", projectId: "proj-1", issueKey: "ATLAS-215", issueUrl: "/jira" },
	// Design System
	{ id: "task-4", name: "Component library", projectId: "proj-2", issueKey: "DS-87", issueUrl: "/jira" },
	{ id: "task-5", name: "Token migration", projectId: "proj-2", issueKey: "DS-91", issueUrl: "/jira" },
	// API Integration
	{ id: "task-6", name: "REST endpoints", projectId: "proj-3", issueKey: "API-34", issueUrl: "/jira" },
	{ id: "task-7", name: "Auth flow", projectId: "proj-3", issueKey: "API-52", issueUrl: "/jira" },
	// Documentation
	{ id: "task-8", name: "API docs", projectId: "proj-4", issueKey: "DOC-12", issueUrl: "/jira" },
	{ id: "task-9", name: "User guides", projectId: "proj-4", issueKey: "DOC-18", issueUrl: "/jira" },
	// Meetings
	{ id: "task-10", name: "Stand-ups", projectId: "proj-5" },
	{ id: "task-11", name: "Sprint planning", projectId: "proj-5" },
];

// ── Seed Data ─────────────────────────────────────────────────────────────

function buildSeedEntries(): TimeEntry[] {
	const today = new Date();
	const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday

	const entries: TimeEntry[] = [];
	let id = 1;

	const push = (
		dayOffset: number,
		taskId: string,
		projectId: string,
		hours: number,
	) => {
		entries.push({
			id: `entry-${id++}`,
			taskId,
			projectId,
			date: format(addDays(weekStart, dayOffset), "yyyy-MM-dd"),
			hours,
		});
	};

	// Monday
	push(0, "task-1", "proj-1", 2);
	push(0, "task-10", "proj-5", 1);
	push(0, "task-4", "proj-2", 2);
	push(0, "task-6", "proj-3", 2);

	// Tuesday
	push(1, "task-2", "proj-1", 3);
	push(1, "task-8", "proj-4", 1.5);
	push(1, "task-7", "proj-3", 2);

	// Wednesday
	push(2, "task-5", "proj-2", 2);
	push(2, "task-11", "proj-5", 1);
	push(2, "task-1", "proj-1", 3);

	// Thursday
	push(3, "task-6", "proj-3", 2);
	push(3, "task-3", "proj-1", 2);
	push(3, "task-10", "proj-5", 1);
	push(3, "task-9", "proj-4", 1.5);

	// Friday
	push(4, "task-4", "proj-2", 2);
	push(4, "task-2", "proj-1", 2);
	push(4, "task-7", "proj-3", 1.5);

	return entries;
}

// ── Helpers ───────────────────────────────────────────────────────────────

export function getEntriesForDate(
	entries: TimeEntry[],
	date: string,
): TimeEntry[] {
	const target = parseISO(date);
	return entries.filter((e) => isSameDay(parseISO(e.date), target));
}

export function getEntriesForWeek(
	entries: TimeEntry[],
	anchorDate: string,
): TimeEntry[] {
	const anchor = parseISO(anchorDate);
	return entries.filter((e) =>
		isSameWeek(parseISO(e.date), anchor, { weekStartsOn: 1 }),
	);
}

export function getDailyTotal(entries: TimeEntry[], date: string): number {
	return getEntriesForDate(entries, date).reduce(
		(sum, e) => sum + e.hours,
		0,
	);
}

export function getWeeklyTotal(
	entries: TimeEntry[],
	anchorDate: string,
): number {
	return getEntriesForWeek(entries, anchorDate).reduce(
		(sum, e) => sum + e.hours,
		0,
	);
}

export function getWeekDays(anchorDate: string): string[] {
	const anchor = parseISO(anchorDate);
	const start = startOfWeek(anchor, { weekStartsOn: 1 });
	const end = endOfWeek(anchor, { weekStartsOn: 1 });
	return eachDayOfInterval({ start, end })
		.slice(0, 5) // Mon–Fri only
		.map((d) => format(d, "yyyy-MM-dd"));
}

export function getProjectById(
	projects: Project[],
	projectId: string,
): Project | undefined {
	return projects.find((p) => p.id === projectId);
}

export function getTaskById(
	tasks: Task[],
	taskId: string,
): Task | undefined {
	return tasks.find((t) => t.id === taskId);
}

export function getTasksByProject(
	tasks: Task[],
	projectId: string,
): Task[] {
	return tasks.filter((t) => t.projectId === projectId);
}

export function getProjectTotals(
	entries: TimeEntry[],
	projects: Project[],
): Array<{ project: Project; hours: number }> {
	const map = new Map<string, number>();
	for (const entry of entries) {
		map.set(
			entry.projectId,
			(map.get(entry.projectId) ?? 0) + entry.hours,
		);
	}
	return projects
		.map((project) => ({ project, hours: map.get(project.id) ?? 0 }))
		.filter((item) => item.hours > 0)
		.sort((a, b) => b.hours - a.hours);
}

/** Get hours logged for a specific task on a specific date. */
export function getTaskHoursForDate(
	entries: TimeEntry[],
	taskId: string,
	date: string,
): number {
	return getEntriesForDate(entries, date)
		.filter((e) => e.taskId === taskId)
		.reduce((sum, e) => sum + e.hours, 0);
}

/** Get total hours for a task across a whole week. */
export function getTaskWeeklyTotal(
	entries: TimeEntry[],
	taskId: string,
	anchorDate: string,
): number {
	return getEntriesForWeek(entries, anchorDate)
		.filter((e) => e.taskId === taskId)
		.reduce((sum, e) => sum + e.hours, 0);
}

/** Build project groups for table view rendering. */
export function buildProjectGroups(
	projects: Project[],
	tasks: Task[],
	expandedProjects: Record<string, boolean>,
): ProjectGroup[] {
	return projects
		.map((project) => ({
			project,
			tasks: getTasksByProject(tasks, project.id),
			expanded: expandedProjects[project.id] ?? true,
		}))
		.filter((group) => group.tasks.length > 0);
}

/** Find or create an entry for a task+date combo (returns entry id if exists). */
export function findEntry(
	entries: TimeEntry[],
	taskId: string,
	date: string,
): TimeEntry | undefined {
	return entries.find((e) => e.taskId === taskId && e.date === date);
}

// ── Initial State ─────────────────────────────────────────────────────────

export function getInitialTimeTrackingState(): TimeTrackingState {
	const today = format(new Date(), "yyyy-MM-dd");
	// All projects start expanded
	const expandedProjects: Record<string, boolean> = {};
	for (const project of PROJECTS) {
		expandedProjects[project.id] = true;
	}

	return {
		entries: buildSeedEntries(),
		projects: PROJECTS,
		tasks: TASKS,
		viewMode: "daily",
		selectedDate: today,
		weeklyTargetHours: 40,
		expandedProjects,
		activeTimer: null,
	};
}
