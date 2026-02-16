export interface PromptGalleryExample {
	iconPath: string;
	title: string;
	description: string;
	useCase: string;
	role: string;
	prompt?: string;
}

export const DEFAULT_PROMPT_GALLERY_EXAMPLES: PromptGalleryExample[] = [
	{ iconPath: "/illustration/rich-icon/search/standard.svg", title: "Analyze customer feedback", description: "Gather and synthesize customer feedback on product or feature.", useCase: "Analysis", role: "Product Manager" },
	{ iconPath: "/illustration/rich-icon/lightbulb/standard.svg", title: "Brainstorm ideas for project", description: "Run a brainstorming session for a topic, problem, or goal.", useCase: "Brainstorming", role: "Product Manager" },
	{ iconPath: "/illustration/rich-icon/software/standard.png", title: "Compare Jira work item", description: "Review the summary, description, and comments of the current request.", useCase: "Analysis", role: "Developer" },
	{ iconPath: "/illustration/rich-icon/develop/standard.svg", title: "Convert request into JQL", description: "Write a JQL query to find unresolved bugs assigned to my team.", useCase: "Analysis", role: "Developer" },
	{ iconPath: "/illustration/rich-icon/content-design/standard.svg", title: "Create a document", description: "Generate a Confluence page summarizing key information.", useCase: "Documentation", role: "Product Manager" },
	{ iconPath: "/illustration/rich-icon/checklist/standard.svg", title: "Create A/B testing plan", description: "Create a detailed A/B testing plan for a project or feature.", useCase: "Planning", role: "Product Manager" },
	{ iconPath: "/illustration/rich-icon/guidelines/standard.svg", title: "Create an effective OKR", description: "Help me draft an effective OKR for my team.", useCase: "Planning", role: "Product Manager" },
	{ iconPath: "/illustration/rich-icon/playbook/standard.svg", title: "Create background research plan", description: "Create a first draft or research plan for a topic.", useCase: "Planning", role: "Product Manager" },
	{ iconPath: "/illustration/rich-icon/onboarding/standard.svg", title: "Create customer onboarding steps", description: "Outline a clear customer onboarding flow for a new account.", useCase: "Planning", role: "Customer Success" },
] as const;

export const PROMPT_GALLERY_USE_CASE_OPTIONS = ["Analysis", "Brainstorming", "Documentation", "Planning"] as const;
export const PROMPT_GALLERY_ROLE_OPTIONS = ["Product Manager", "Developer", "Designer", "Customer Success"] as const;

export function getExamplePrompt(example: PromptGalleryExample): string {
	return example.prompt ?? `${example.title}. ${example.description}`;
}
