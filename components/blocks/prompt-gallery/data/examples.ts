export interface PromptGalleryExample {
	iconPath: string;
	title: string;
	description: string;
	useCase: string;
	role: string;
	prompt?: string;
}

export { DEFAULT_PROMPT_GALLERY_EXAMPLES, PROMPT_GALLERY_USE_CASE_OPTIONS, PROMPT_GALLERY_ROLE_OPTIONS } from "./example-data";

export function getExamplePrompt(example: PromptGalleryExample): string {
	return example.prompt ?? `${example.title}. ${example.description}`;
}
