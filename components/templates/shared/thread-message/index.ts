import { ThreadMessageRoot } from "./thread-message-root";
import { ThreadMessageReasoning } from "./thread-message-reasoning";
import { ThreadMessageThinkingStatus } from "./thread-message-thinking-status";
import { ThreadMessageContent } from "./thread-message-content";
import { ThreadMessageFeedback } from "./thread-message-feedback";
import { ThreadMessageTools } from "./thread-message-tools";
import { ThreadMessageToolFirstWarning } from "./thread-message-tool-first-warning";
import { ThreadMessageSources } from "./thread-message-sources";
import { ThreadMessageSuggestions } from "./thread-message-suggestions";
import { ThreadMessageWidget } from "./thread-message-widget";

export {
	ThreadMessageRoot,
	ThreadMessageReasoning,
	ThreadMessageThinkingStatus,
	ThreadMessageContent,
	ThreadMessageFeedback,
	ThreadMessageTools,
	ThreadMessageToolFirstWarning,
	ThreadMessageSources,
	ThreadMessageSuggestions,
	ThreadMessageWidget,
};

export const ThreadMessage = {
	Root: ThreadMessageRoot,
	Reasoning: ThreadMessageReasoning,
	ThinkingStatus: ThreadMessageThinkingStatus,
	Content: ThreadMessageContent,
	Feedback: ThreadMessageFeedback,
	Tools: ThreadMessageTools,
	ToolFirstWarning: ThreadMessageToolFirstWarning,
	Sources: ThreadMessageSources,
	Suggestions: ThreadMessageSuggestions,
	Widget: ThreadMessageWidget,
} as const;
