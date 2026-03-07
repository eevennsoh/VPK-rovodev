import type { FutureChatModelOption } from "@/lib/future-chat-types";

export const FUTURE_CHAT_MODELS: readonly FutureChatModelOption[] = [
	{
		id: "anthropic/claude-4.5-sonnet",
		label: "Claude 4.5 Sonnet",
		provider: "anthropic",
		description: "Best default for deep reasoning and code-heavy prompts.",
	},
	{
		id: "openai/gpt-4.1",
		label: "GPT-4.1",
		provider: "openai",
		description: "Balanced model for drafting, structured answers, and iteration.",
	},
	{
		id: "google/gemini-2.5-pro",
		label: "Gemini 2.5 Pro",
		provider: "google",
		description: "Good fallback for broad multimodal and long-context requests.",
	},
] as const;

export const DEFAULT_FUTURE_CHAT_MODEL = FUTURE_CHAT_MODELS[0];
