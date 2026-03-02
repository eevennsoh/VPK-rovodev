/**
 * Static sample data for the Project Dashboard
 * Contains 18 tasks across 3 statuses and 5 team members
 */

export type TaskStatus = "todo" | "inprogress" | "done";
export type TaskPriority = "Low" | "Medium" | "High";
export type TaskType =
	| "Feature"
	| "Bug"
	| "Design"
	| "Documentation"
	| "Research"
	| "Performance"
	| "Security"
	| "DevOps"
	| "Infrastructure"
	| "Testing"
	| "Refactor"
	| "Accessibility"
	| "Legal"
	| "Deployment";

export interface TeamMember {
	id: string;
	name: string;
	initials: string;
}

export interface Task {
	id: string;
	summary: string;
	status: TaskStatus;
	priority: TaskPriority;
	assigneeId: string;
	type: TaskType;
	createdAt: string;
	updatedAt: string;
}

/**
 * Team members for the project
 * 5 members with consistent initials for avatar fallbacks
 */
export const TEAM_MEMBERS: TeamMember[] = [
	{ id: "alice", name: "Alice Schmidt", initials: "AS" },
	{ id: "bob", name: "Bob Chen", initials: "BC" },
	{ id: "carol", name: "Carol Johnson", initials: "CJ" },
	{ id: "david", name: "David Martinez", initials: "DM" },
	{ id: "elena", name: "Elena Patel", initials: "EP" },
];

/**
 * Sample tasks across To Do, In Progress, and Done statuses
 * 6 tasks per status for balanced distribution
 */
export const SAMPLE_TASKS: Task[] = [
	// To Do - 6 tasks
	{
		id: "TASK-001",
		summary: "Design new landing page mockups",
		status: "todo",
		priority: "High",
		assigneeId: "alice",
		type: "Design",
		createdAt: "2026-02-20T10:00:00Z",
		updatedAt: "2026-02-24T14:30:00Z",
	},
	{
		id: "TASK-002",
		summary: "Update API documentation for v3",
		status: "todo",
		priority: "Medium",
		assigneeId: "bob",
		type: "Documentation",
		createdAt: "2026-02-21T09:15:00Z",
		updatedAt: "2026-02-24T11:20:00Z",
	},
	{
		id: "TASK-003",
		summary: "Fix mobile navigation responsive bug",
		status: "todo",
		priority: "High",
		assigneeId: "carol",
		type: "Bug",
		createdAt: "2026-02-22T13:45:00Z",
		updatedAt: "2026-02-24T16:00:00Z",
	},
	{
		id: "TASK-004",
		summary: "Add user profile settings page",
		status: "todo",
		priority: "Medium",
		assigneeId: "david",
		type: "Feature",
		createdAt: "2026-02-18T11:30:00Z",
		updatedAt: "2026-02-23T09:45:00Z",
	},
	{
		id: "TASK-005",
		summary: "Conduct accessibility audit for WCAG 2.1",
		status: "todo",
		priority: "Low",
		assigneeId: "elena",
		type: "Accessibility",
		createdAt: "2026-02-19T08:00:00Z",
		updatedAt: "2026-02-24T10:30:00Z",
	},
	{
		id: "TASK-006",
		summary: "Research performance monitoring tools",
		status: "todo",
		priority: "Low",
		assigneeId: "alice",
		type: "Research",
		createdAt: "2026-02-17T14:20:00Z",
		updatedAt: "2026-02-24T15:45:00Z",
	},

	// In Progress - 6 tasks
	{
		id: "TASK-007",
		summary: "Implement OAuth2 authentication flow",
		status: "inprogress",
		priority: "High",
		assigneeId: "bob",
		type: "Feature",
		createdAt: "2026-02-20T12:00:00Z",
		updatedAt: "2026-02-25T08:15:00Z",
	},
	{
		id: "TASK-008",
		summary: "Optimize database query performance",
		status: "inprogress",
		priority: "High",
		assigneeId: "carol",
		type: "Performance",
		createdAt: "2026-02-21T10:30:00Z",
		updatedAt: "2026-02-25T09:00:00Z",
	},
	{
		id: "TASK-009",
		summary: "Create interactive onboarding tutorial",
		status: "inprogress",
		priority: "Medium",
		assigneeId: "david",
		type: "Feature",
		createdAt: "2026-02-19T15:45:00Z",
		updatedAt: "2026-02-25T13:20:00Z",
	},
	{
		id: "TASK-010",
		summary: "Review security audit findings and fixes",
		status: "inprogress",
		priority: "High",
		assigneeId: "elena",
		type: "Security",
		createdAt: "2026-02-22T11:00:00Z",
		updatedAt: "2026-02-25T14:30:00Z",
	},
	{
		id: "TASK-011",
		summary: "Update design system color tokens",
		status: "inprogress",
		priority: "Low",
		assigneeId: "alice",
		type: "Design",
		createdAt: "2026-02-23T09:30:00Z",
		updatedAt: "2026-02-25T10:45:00Z",
	},
	{
		id: "TASK-012",
		summary: "Write integration tests for payment module",
		status: "inprogress",
		priority: "Medium",
		assigneeId: "bob",
		type: "Testing",
		createdAt: "2026-02-20T14:15:00Z",
		updatedAt: "2026-02-25T11:00:00Z",
	},

	// Done - 6 tasks
	{
		id: "TASK-013",
		summary: "Set up CI/CD pipeline with GitHub Actions",
		status: "done",
		priority: "High",
		assigneeId: "carol",
		type: "DevOps",
		createdAt: "2026-02-10T09:00:00Z",
		updatedAt: "2026-02-20T16:30:00Z",
	},
	{
		id: "TASK-014",
		summary: "Migrate application to new hosting provider",
		status: "done",
		priority: "Medium",
		assigneeId: "david",
		type: "Infrastructure",
		createdAt: "2026-02-12T10:15:00Z",
		updatedAt: "2026-02-19T13:45:00Z",
	},
	{
		id: "TASK-015",
		summary: "Refactor legacy authentication module",
		status: "done",
		priority: "Low",
		assigneeId: "elena",
		type: "Refactor",
		createdAt: "2026-02-08T11:30:00Z",
		updatedAt: "2026-02-18T14:00:00Z",
	},
	{
		id: "TASK-016",
		summary: "Integrate analytics tracking library",
		status: "done",
		priority: "Medium",
		assigneeId: "alice",
		type: "Feature",
		createdAt: "2026-02-15T08:45:00Z",
		updatedAt: "2026-02-21T10:20:00Z",
	},
	{
		id: "TASK-017",
		summary: "Deploy v2.0 to production",
		status: "done",
		priority: "High",
		assigneeId: "bob",
		type: "Deployment",
		createdAt: "2026-02-14T12:00:00Z",
		updatedAt: "2026-02-17T15:30:00Z",
	},
	{
		id: "TASK-018",
		summary: "Update privacy policy and terms of service",
		status: "done",
		priority: "Low",
		assigneeId: "carol",
		type: "Legal",
		createdAt: "2026-02-13T09:00:00Z",
		updatedAt: "2026-02-16T11:45:00Z",
	},
];

/**
 * Helper function to get team member by ID
 */
export function getTeamMember(id: string): TeamMember | undefined {
	return TEAM_MEMBERS.find((member) => member.id === id);
}

/**
 * Helper function to get tasks by status
 */
export function getTasksByStatus(status: TaskStatus): Task[] {
	return SAMPLE_TASKS.filter((task) => task.status === status);
}

/**
 * Helper function to get task statistics
 */
export function getTaskStats() {
	return {
		total: SAMPLE_TASKS.length,
		todo: getTasksByStatus("todo").length,
		inprogress: getTasksByStatus("inprogress").length,
		done: getTasksByStatus("done").length,
	};
}
