import { type WorkItem, type Comment, type LinkedItem } from "../types";

export const mockWorkItem: WorkItem = {
	key: "PROJ-1234",
	title: "Implement user authentication with OAuth 2.0",
	description:
		"We need to implement OAuth 2.0 authentication to replace the current basic auth system. This should support multiple providers including Google, GitHub, and Microsoft. The implementation must be secure, follow best practices, and maintain backward compatibility with existing user sessions.\n\nAcceptance Criteria:\n- Users can login with Google, GitHub, or Microsoft\n- Existing user sessions remain valid\n- New OAuth tokens are properly stored and refreshed\n- Error handling for failed authentications\n- Rate limiting to prevent brute force attacks\n- Comprehensive unit and integration tests",
	type: "Story",
	status: "In Progress",
	priority: "High",
	assignee: {
		name: "Sarah Chen",
		avatar: "https://ui-avatars.com/api/?name=Sarah+Chen&background=0D8ABC&color=fff",
		initials: "SC",
		role: "Senior Engineer",
	},
	reporter: "Alex Johnson",
	created: "Feb 15, 2026",
	updated: "Feb 19, 2026 at 2:30 PM",
	dueDate: "Mar 5, 2026",
	labels: ["authentication", "security", "backend", "high-priority"],
	storyPoints: 13,
	estimatedHours: 40,
	components: ["Auth Service", "API Gateway", "User Management"],
};

export const mockComments: Comment[] = [
	{
		id: "1",
		author: {
			name: "Marcus Lee",
			avatar: "https://ui-avatars.com/api/?name=Marcus+Lee&background=FF6B6B&color=fff",
			initials: "ML",
		},
		text: "I've reviewed the OAuth implementation plan. Looks good overall, but we should also consider implementing PKCE for enhanced security with public clients.",
		timestamp: "Feb 18, 2026",
		likes: 3,
	},
	{
		id: "2",
		author: {
			name: "Sarah Chen",
			avatar: "https://ui-avatars.com/api/?name=Sarah+Chen&background=0D8ABC&color=fff",
			initials: "SC",
		},
		text: "Thanks for the feedback! Yes, PKCE is already part of our implementation plan. I've added it to the acceptance criteria.",
		timestamp: "Feb 18, 2026 at 3:15 PM",
		likes: 2,
	},
	{
		id: "3",
		author: {
			name: "Emily Rodriguez",
			avatar: "https://ui-avatars.com/api/?name=Emily+Rodriguez&background=51CF66&color=fff",
			initials: "ER",
		},
		text: "Just completed the database schema updates for OAuth token storage. Tables are ready for the auth service to use.",
		timestamp: "Feb 19, 2026",
		likes: 5,
	},
];

export const mockLinkedItems: LinkedItem[] = [
	{
		key: "PROJ-1235",
		title: "Add password reset functionality",
		type: "relates to",
		status: "To Do",
	},
	{
		key: "PROJ-1200",
		title: "Update authentication documentation",
		type: "relates to",
		status: "To Do",
	},
	{
		key: "PROJ-1240",
		title: "Set up OAuth provider configuration",
		type: "blocks",
		status: "In Progress",
	},
	{
		key: "INFRA-456",
		title: "Configure OAuth keys in production",
		type: "is blocked by",
		status: "To Do",
	},
];
