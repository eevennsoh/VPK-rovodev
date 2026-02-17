import type { ComponentDetail } from "@/app/data/component-detail-types";

export const BLOCK_DETAILS: Record<string, ComponentDetail> = {
	"agent-grid": {
		description: "Agent execution grid with live task tiles and minimal prompt input.",
	},
	"agent-progress": {
		description: "ADS-style agent progress tracker with expandable task status groups, live elapsed timer, and agent attribution.",
		usage: `import AgentsProgress from "@/components/blocks/agent-progress/page";

<AgentsProgress />
<AgentsProgress runStatus="completed" collapsed />
<AgentsProgress runStatus="failed" />`,
		props: [
			{
				name: "planTitle",
				type: "string",
				default: '"Flexible Friday Plan"',
				description: "Title displayed in the progress header.",
			},
			{
				name: "planEmoji",
				type: "string",
				default: '"🔥"',
				description: "Emoji icon shown in the avatar circle.",
			},
			{
				name: "taskStatusGroups",
				type: "ProgressStatusGroups",
				description: "Object with done, inReview, inProgress, and todo task arrays.",
			},
			{
				name: "runStatus",
				type: '"running" | "completed" | "failed"',
				default: '"running"',
				description: "Current execution status of the run.",
			},
			{
				name: "runCreatedAt",
				type: "string | null",
				description: "ISO timestamp when the run started. Used for elapsed time calculation.",
			},
			{
				name: "runCompletedAt",
				type: "string | null",
				description: "ISO timestamp when the run finished. Stops the elapsed timer.",
			},
			{
				name: "runCount",
				type: "number",
				default: "1",
				description: "Number of runs displayed in the status bar.",
			},
			{
				name: "agentCount",
				type: "number",
				default: "10",
				description: "Number of agents shown in the running status text.",
			},
			{
				name: "collapsed",
				type: "boolean",
				default: "false",
				description: "When true, hides the task list and status bar, showing only the header.",
			},
		],
		examples: [
			{ title: "Running", description: "Default running state with mixed task progress.", demoSlug: "agent-progress-demo-running" },
			{ title: "Completed", description: "Completed run with all tasks done.", demoSlug: "agent-progress-demo-completed" },
			{ title: "Failed", description: "Failed run with remaining tasks.", demoSlug: "agent-progress-demo-failed" },
			{ title: "Collapsed", description: "Compact header-only view for completed runs.", demoSlug: "agent-progress-demo-collapsed" },
			{ title: "Collapsed (running)", description: "Compact header-only view while still running.", demoSlug: "agent-progress-demo-collapsed-running" },
			{ title: "With agents", description: "Tasks with agent attribution badges.", demoSlug: "agent-progress-demo-with-agents" },
			{ title: "Early progress", description: "Run just started with mostly todo tasks.", demoSlug: "agent-progress-demo-early-progress" },
			{ title: "Multiple runs", description: "Progress tracker showing multiple run count.", demoSlug: "agent-progress-demo-multiple-runs" },
			{ title: "All states", description: "Running, completed, and failed states side by side.", demoSlug: "agent-progress-demo-all-states" },
		],
	},
	"app-sidebar": {
		description: "Application sidebar with main navigation, documents, secondary nav, and user menu.",
	},
	"agent-summary": {
		description: "Agent summary block with agents-team chrome, final synthesis, interactive dashboard, visual iframe preview, and grouped agent outputs.",
	},
	dashboard: {
		description: "A full dashboard layout with sidebar navigation, charts, and data tables.",
	},
	"sidebar-01": {
		description: "Basic sidebar navigation layout.",
	},
	"sidebar-02": {
		description: "Sidebar with grouped navigation items and icons.",
	},
	"sidebar-03": {
		description: "Collapsible sidebar with toggle control.",
	},
	"sidebar-04": {
		description: "Sidebar with floating variant and rounded styling.",
	},
	"sidebar-05": {
		description: "Sidebar with secondary navigation rail.",
	},
	"sidebar-06": {
		description: "Sidebar with nested sub-navigation items.",
	},
	"sidebar-07": {
		description: "Sidebar with icon-only collapsed state.",
	},
	"sidebar-08": {
		description: "Sidebar with inset content area layout.",
	},
	"sidebar-09": {
		description: "Sidebar with controlled open/close state.",
	},
	"sidebar-10": {
		description: "Sidebar with header, search, and footer sections.",
	},
	"sidebar-11": {
		description: "Sidebar with collapsible grouped sections.",
	},
	"sidebar-12": {
		description: "Sidebar with user avatar and account switcher.",
	},
	"sidebar-13": {
		description: "Sidebar with right-aligned secondary panel.",
	},
	"sidebar-14": {
		description: "Sidebar with tabbed content sections.",
	},
	"sidebar-15": {
		description: "Sidebar with notification badges and indicators.",
	},
	"sidebar-16": {
		description: "Sidebar with drag-and-drop reorderable items.",
	},
	"login-01": {
		description: "Simple centered login form with email and password.",
	},
	"login-02": {
		description: "Login form with social authentication providers.",
	},
	"login-03": {
		description: "Split-screen login with illustration panel.",
	},
	"login-04": {
		description: "Login form embedded within a card layout.",
	},
	"login-05": {
		description: "Login form with two-column responsive layout.",
	},
	chatgpt: {
		description: "ChatGPT-style prompt form with model selector, group chat dialog, and project creation.",
	},
	"data-table": {
		description: "Data table with sortable columns, status indicators, and reviewer assignments.",
	},
	"top-navigation": {
		description: "ADS-inspired top navigation bar with app switcher, search workflows, and contextual actions.",
	},
	"prompt-gallery": {
		description: "ADS prompt gallery block with quick chips, hover previews, and discover-more examples.",
	},
	"shared-ui": {
		description: "Shared ADS utility primitives used across templates, including heading styles and customization menu patterns.",
	},
	"settings-dialog": {
		description: "Settings dialog with configurable options and preferences.",
	},
	"product-sidebar": {
		description: "ADS-style product sidebar with Jira and Confluence navigation variants.",
	},
	"sidebar-rail": {
		description: "Pinned/hover sidebar rail block with header controls and responsive sidebar reveal behavior.",
	},
	"signup-01": {
		description: "Simple centered signup form with name, email, and password.",
	},
	"signup-02": {
		description: "Two-column signup with cover image and split layout.",
	},
	"signup-03": {
		description: "Signup form with social authentication providers on muted background.",
	},
	"signup-04": {
		description: "Signup form embedded within a card with image panel.",
	},
	"signup-05": {
		description: "Signup form with two-column social providers and branding.",
	},
	"work-item-widget": {
		description: "Embeddable ADS work-items widget with status rows and insert actions.",
	},
	"question-card": {
		description: "ADS-style question card with ranked options, pagination controls, and a disabled submit state.",
	},
	"approval-card": {
		description: "ADS-style approval card for plan acceptance with ranked options and a custom input.",
	},
	chatbot: {
		description: "Full-featured AI chatbot with conversation, messages, reasoning, suggestions, and model selector.",
	},
	ide: {
		description: "IDE-style coding agent with file tree, code editor, terminal, and AI chat panel with tool calls.",
	},
	generative: {
		description: "v0-style generative UI with prompt input, artifact container, and preview/code toggle.",
	},
	workflow: {
		description: "Multi-step agentic workflow with agent configuration, plan rendering, tool calls, and confirmation dialogs.",
	},
};
