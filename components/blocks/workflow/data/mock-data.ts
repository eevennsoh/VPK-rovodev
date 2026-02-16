export const MOCK_AGENT_CONFIG = {
	name: "Code Review Agent",
	model: "claude-4-sonnet",
	instructions:
		"You are a senior code reviewer. Analyze pull requests for correctness, security vulnerabilities, performance issues, and adherence to project conventions. Provide actionable feedback with specific file and line references.",
	tools: [
		{
			name: "readFile",
			description: "Read the contents of a file in the repository",
			schema: {
				type: "object",
				properties: {
					path: { type: "string", description: "File path relative to repo root" },
				},
				required: ["path"],
			},
		},
		{
			name: "searchCode",
			description: "Search for code patterns across the repository",
			schema: {
				type: "object",
				properties: {
					query: { type: "string", description: "Search query or regex pattern" },
					filePattern: { type: "string", description: "Glob pattern to filter files" },
				},
				required: ["query"],
			},
		},
		{
			name: "runTests",
			description: "Execute test suite for specified files or directories",
			schema: {
				type: "object",
				properties: {
					path: { type: "string", description: "Path to test file or directory" },
					watch: { type: "boolean", description: "Run in watch mode" },
				},
				required: ["path"],
			},
		},
	],
};

export const MOCK_PLAN_STEPS = {
	title: "PR Review Plan",
	description: "Reviewing PR #142: Add user authentication middleware",
	steps: [
		{ label: "Read changed files", status: "completed" as const },
		{ label: "Check for security vulnerabilities", status: "completed" as const },
		{ label: "Verify test coverage", status: "in-progress" as const },
		{ label: "Review error handling patterns", status: "pending" as const },
		{ label: "Generate review summary", status: "pending" as const },
	],
};

export const MOCK_WORKFLOW_MESSAGES: {
	id: string;
	role: "user" | "assistant";
	content: string;
	plan?: { title: string; description: string };
	toolCalls?: {
		name: string;
		state: "output-available";
		input: Record<string, unknown>;
		output: Record<string, unknown>;
	}[];
	confirmation?: {
		id: string;
		state: "approval-requested";
		message: string;
	};
}[] = [
	{
		id: "wf-1",
		role: "user",
		content: "Review the latest PR for the authentication module",
	},
	{
		id: "wf-2",
		role: "assistant",
		content: "I'll review PR #142 which adds user authentication middleware. Let me start by reading the changed files and creating a review plan.",
		plan: {
			title: "PR Review Plan",
			description: "Reviewing PR #142: Add user authentication middleware",
		},
	},
	{
		id: "wf-3",
		role: "assistant",
		content: "",
		toolCalls: [
			{
				name: "readFile",
				state: "output-available",
				input: { path: "src/middleware/auth.ts" },
				output: { lines: 47, size: "1.2kb" },
			},
			{
				name: "searchCode",
				state: "output-available",
				input: { query: "jwt.verify", filePattern: "*.ts" },
				output: { matches: 3, files: ["src/middleware/auth.ts", "src/lib/token.ts", "src/tests/auth.test.ts"] },
			},
		],
	},
	{
		id: "wf-4",
		role: "assistant",
		content: "I found a potential security issue. The JWT secret is being read from `process.env` without a fallback validation check. If the environment variable is missing, the middleware silently passes all requests through.\n\n**Recommendation:** Add an initialization check that throws if `JWT_SECRET` is not configured:\n\n```typescript\nif (!process.env.JWT_SECRET) {\n  throw new Error('JWT_SECRET environment variable is required');\n}\n```\n\nI'll now verify the test coverage for this middleware.",
		confirmation: {
			id: "conf-1",
			state: "approval-requested",
			message: "Run the test suite to verify authentication coverage?",
		},
	},
];
