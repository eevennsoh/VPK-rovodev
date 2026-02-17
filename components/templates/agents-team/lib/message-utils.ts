import {
	getLatestDataPart,
	getMessageText,
	isMessageTextStreaming,
	type RovoUIMessage,
} from "@/lib/rovo-ui-messages";

export function getWidgetTypeFromPart(part: RovoUIMessage["parts"][number]): string | null {
	if (part.type !== "data-widget-data" && part.type !== "data-widget-loading") {
		return null;
	}

	const dataType = (part as { data?: { type?: unknown } }).data?.type;
	if (typeof dataType !== "string") {
		return null;
	}

	const normalizedType = dataType.trim();
	return normalizedType.length > 0 ? normalizedType : null;
}

export function hasPlanWidgetPart(message: RovoUIMessage): boolean {
	if (message.role !== "assistant") {
		return false;
	}

	return message.parts.some((part) => getWidgetTypeFromPart(part) === "plan");
}

export function hasQuestionCardWidgetPart(message: RovoUIMessage): boolean {
	if (message.role !== "assistant") {
		return false;
	}

	return message.parts.some(
		(part) => getWidgetTypeFromPart(part) === "question-card"
	);
}

export function hasCompleteMermaidDiagram(message: RovoUIMessage): boolean {
	if (message.role !== "assistant") {
		return false;
	}

	const text = getMessageText(message);
	return /```mermaid\b[\s\S]*?```/.test(text);
}

function getLatestPlanMessage(
	messages: ReadonlyArray<RovoUIMessage>
): RovoUIMessage | null {
	for (let index = messages.length - 1; index >= 0; index--) {
		const message = messages[index];
		if (hasPlanWidgetPart(message)) {
			return message;
		}
	}

	return null;
}

export function isPlanResponseComplete(messages: ReadonlyArray<RovoUIMessage>): boolean {
	const latestPlanMessage = getLatestPlanMessage(messages);
	if (!latestPlanMessage) {
		return false;
	}

	if (isMessageTextStreaming(latestPlanMessage)) {
		return false;
	}

	return hasCompleteMermaidDiagram(latestPlanMessage);
}

function stripAssistantTextParts(message: RovoUIMessage): RovoUIMessage {
	if (message.role !== "assistant") {
		return message;
	}

	const nextParts = message.parts.filter((part) => part.type !== "text");
	if (nextParts.length === message.parts.length) {
		return message;
	}

	return {
		...message,
		parts: nextParts,
	};
}

function isHiddenPlanningSubmissionMessage(message: RovoUIMessage): boolean {
	if (message.role !== "user") {
		return false;
	}

	if (message.metadata?.visibility !== "hidden") {
		return false;
	}

	return (
		message.metadata?.source === "clarification-submit" ||
		message.metadata?.source === "plan-approval-submit" ||
		message.metadata?.source === "agent-team-plan-retry"
	);
}

export function normalizeAgentsTeamMessages(
	rawUiMessages: ReadonlyArray<RovoUIMessage>,
	isStreaming: boolean
): RovoUIMessage[] {
	const latestHiddenSubmissionIndex = rawUiMessages.findLastIndex(
		isHiddenPlanningSubmissionMessage
	);

	return rawUiMessages.reduce<RovoUIMessage[]>((result, message, index) => {
		if (message.role !== "assistant") {
			result.push(message);
			return result;
		}

		const shouldSuppressStreamingText =
			isStreaming &&
			latestHiddenSubmissionIndex !== -1 &&
			index > latestHiddenSubmissionIndex;
		const shouldSuppressPlanText =
			hasPlanWidgetPart(message) && !hasCompleteMermaidDiagram(message);
		const shouldSuppressQuestionCardText = hasQuestionCardWidgetPart(message);
		const shouldSuppressText =
			shouldSuppressStreamingText ||
			shouldSuppressPlanText ||
			shouldSuppressQuestionCardText;
		if (!shouldSuppressText) {
			result.push(message);
			return result;
		}

		const normalizedMessage = stripAssistantTextParts(message);
		if (normalizedMessage.parts.length === 0) {
			return result;
		}

		result.push(normalizedMessage);
		return result;
	}, []);
}

export function isAnyWidgetCurrentlyLoading(
	messages: ReadonlyArray<RovoUIMessage>
): boolean {
	for (let index = messages.length - 1; index >= 0; index--) {
		const message = messages[index];
		if (message.role !== "assistant") {
			continue;
		}

		const loadingPart = getLatestDataPart(message, "data-widget-loading");
		return loadingPart?.data.loading === true;
	}

	return false;
}

export function getLoadingWidgetType(
	messages: ReadonlyArray<RovoUIMessage>
): string | null {
	for (let index = messages.length - 1; index >= 0; index--) {
		const message = messages[index];
		if (message.role !== "assistant") {
			continue;
		}

		const loadingPart = getLatestDataPart(message, "data-widget-loading");
		if (loadingPart?.data.loading === true) {
			return typeof loadingPart.data.type === "string"
				? loadingPart.data.type
				: null;
		}

		return null;
	}

	return null;
}

function isConversationMessage(
	message: RovoUIMessage
): message is RovoUIMessage & { role: "user" | "assistant" } {
	return message.role === "user" || message.role === "assistant";
}

export function toConversationItems(
	messages: ReadonlyArray<RovoUIMessage>
): Array<{ role: "user" | "assistant"; content: string }> {
	return messages
		.filter(isConversationMessage)
		.map((message) => ({
			role: message.role,
			content: getMessageText(message),
		}))
		.filter((message) => message.content.length > 0);
}

export function getLatestVisibleUserPrompt(
	messages: ReadonlyArray<RovoUIMessage>
): string {
	for (let index = messages.length - 1; index >= 0; index--) {
		const message = messages[index];
		if (message.role !== "user") {
			continue;
		}

		const text = getMessageText(message);
		if (text.length > 0) {
			return text;
		}
	}

	return "";
}

export function toAgentStatusKey(agentName: string): string {
	return agentName.trim().toLowerCase();
}

export function toErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message.trim();
	}

	return "Request failed";
}
