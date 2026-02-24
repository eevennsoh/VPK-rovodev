import type { ComponentDetail } from "@/app/data/component-detail-types";

export const BLOCK_DETAILS: Record<string, ComponentDetail> = {
	"agent-grid": {
		description: "Agent execution grid with live task tiles and minimal prompt input.",
		demoLayout: {
			previewContentWidth: "full",
		},
	},
	"agent-progress": {
		description: "ADS-style agent progress tracker with expandable task status groups, live elapsed timer, and agent attribution.",
		usage: `import AgentsProgress from "@/components/blocks/agent-progress/page";

<AgentsProgress />
<AgentsProgress runStatus="completed" defaultCollapsed />
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
				description: "Object with done, inReview, inProgress, failed, and todo task arrays.",
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
				name: "defaultCollapsed",
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
	"work-item-detail": {
		description: "Comprehensive work item detail view with description, comments, linked items, and activity history.",
	},
	"question-card": {
		description: "ADS-style question card with single-select (numbered) and multi-select (checkbox) options, keyboard navigation, question pagination, and free-form custom input.",
		usage: `import { QuestionCard } from "@/components/blocks/question-card/page";
import type { QuestionCardQuestion } from "@/components/blocks/question-card/page";

const questions: QuestionCardQuestion[] = [
  {
    id: "deploy",
    label: "Which deployment strategy?",
    kind: "single-select",
    options: [
      { id: "blue-green", label: "Blue-green" },
      { id: "canary", label: "Canary release" },
    ],
  },
];

<QuestionCard
  questions={questions}
  onSubmit={(answers) => console.log(answers)}
  onDismiss={() => {}}
/>`,
		props: [
			{
				name: "questions",
				type: "ReadonlyArray<QuestionCardQuestion>",
				required: true,
				description: "Ordered list of questions to present. Each question defines its selection mode via the kind field.",
			},
			{
				name: "onSubmit",
				type: "(answers: QuestionCardAnswers) => void",
				required: true,
				description: "Called with the collected answers when the user completes all questions or clicks Submit.",
			},
			{
				name: "onDismiss",
				type: "() => void",
				description: "Called when the user dismisses the card. When omitted the dismiss button is hidden.",
			},
			{
				name: "isSubmitting",
				type: "boolean",
				default: "false",
				description: "Disables all interactions and shows a loading state on the submit button.",
			},
			{
				name: "maxVisibleOptions",
				type: "number",
				default: "4",
				description: "Maximum number of pre-defined options to show per question. Additional options are truncated.",
			},
			{
				name: "customInputPlaceholder",
				type: "string",
				default: '"Tell Rovo what to do..."',
				description: "Placeholder text for the free-form custom input row.",
			},
			{
				name: "showCustomInput",
				type: "boolean",
				default: "true",
				description: "Whether to show the free-form custom input row after the option list.",
			},
			{
				name: "defaultAnswers",
				type: "QuestionCardAnswers",
				default: "{}",
				description: "Pre-populated answers keyed by question ID. Useful for restoring previous selections.",
			},
			{
				name: "className",
				type: "string",
				description: "Additional CSS classes merged onto the root container.",
			},
		],
		subComponents: [
			{
				name: "QuestionCardQuestion",
				description: "Shape of each question in the questions array.",
				props: [
					{ name: "id", type: "string", required: true, description: "Unique identifier for the question." },
					{ name: "label", type: "string", required: true, description: "Question text displayed as a heading." },
					{
						name: "kind",
						type: '"single-select" | "multi-select" | "text"',
						required: true,
						description: "Selection mode. single-select shows numbered options and auto-advances. multi-select shows checkboxes on the right and allows multiple picks.",
					},
					{ name: "options", type: "ReadonlyArray<QuestionCardOption>", required: true, description: "Pre-defined answer options." },
				],
			},
			{
				name: "QuestionCardOption",
				description: "Shape of each option within a question.",
				props: [
					{ name: "id", type: "string", required: true, description: "Unique identifier for the option." },
					{ name: "label", type: "string", required: true, description: "Display label for the option." },
					{ name: "description", type: "string", description: "Optional secondary description shown below the label." },
				],
			},
		],
		examples: [
			{ title: "Single-select", description: "Numbered options with auto-advance on selection.", demoSlug: "question-card-demo-single-select" },
			{ title: "Multi-select", description: "Checkbox indicators on the right allow multiple selections.", demoSlug: "question-card-demo-multi-select" },
			{ title: "Text only", description: "Single free-form text input with no pre-defined options.", demoSlug: "question-card-demo-text-only" },
			{ title: "Mixed flow", description: "Multi-question flow combining single-select and multi-select with pagination.", demoSlug: "question-card-demo-mixed" },
			{ title: "Without custom input", description: "Custom input row hidden via showCustomInput={false}.", demoSlug: "question-card-demo-no-custom-input" },
			{ title: "Custom placeholder", description: "Custom placeholder text for the free-form input.", demoSlug: "question-card-demo-custom-placeholder" },
			{ title: "Pre-populated answers", description: "Answers pre-selected via defaultAnswers prop.", demoSlug: "question-card-demo-pre-populated" },
		],
	},
	"approval-card": {
		description: "ADS-style approval card for plan acceptance with ranked options and a custom input.",
	},
	chatbot: {
		description: "Full-featured AI chatbot with conversation, messages, reasoning, suggestions, and model selector.",
	},
	"yolo-color-blocks": {
		description: "Simple color block component converted from Figma design with grid and absolute positioning variants.",
		usage: `import { YoloColorBlocks } from "@/components/blocks/yolo-color-blocks";

// Grid variant (responsive, recommended)
<YoloColorBlocks variant="grid" blockSize="md" />

// Absolute variant (original Figma design)
<YoloColorBlocks variant="absolute" />`,
		props: [
			{
				name: "variant",
				type: '"grid" | "absolute"',
				default: '"grid"',
				description: "Layout variant: grid (responsive) or absolute (original design).",
			},
			{
				name: "blockSize",
				type: '"sm" | "md" | "lg"',
				default: '"md"',
				description: "Size of individual color blocks.",
			},
			{
				name: "className",
				type: "string",
				description: "Additional CSS classes merged onto the root container.",
			},
		],
		examples: [
			{ title: "Grid (Small)", description: "Responsive grid layout with small blocks.", demoSlug: "yolo-color-blocks-grid-small" },
			{ title: "Grid (Medium)", description: "Responsive grid layout with medium blocks.", demoSlug: "yolo-color-blocks-grid-medium" },
			{ title: "Grid (Large)", description: "Responsive grid layout with large blocks.", demoSlug: "yolo-color-blocks-grid-large" },
			{ title: "Absolute (Original)", description: "Exact reproduction of Figma design with absolute positioning.", demoSlug: "yolo-color-blocks-absolute" },
		],
	},
	ide: {
		description: "IDE-style coding agent with file tree, code editor, terminal, and AI chat panel with tool calls.",
	},
	"kanban-sprint": {
		description: "Sprint planning kanban board with drag-and-drop task cards, status columns, sprint metrics, and story point tracking.",
	},
	generative: {
		description: "v0-style generative UI with prompt input, artifact container, and preview/code toggle.",
	},
	workflow: {
		description: "Multi-step agentic workflow with agent configuration, plan rendering, tool calls, and confirmation dialogs.",
	},
};
