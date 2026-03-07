function getNonEmptyString(value) {
	if (typeof value !== "string") {
		return null;
	}

	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : null;
}

function normalizeArtifactKind(value) {
	const normalizedValue = getNonEmptyString(value)?.toLowerCase();
	if (normalizedValue === "code") {
		return "code";
	}

	if (normalizedValue === "sheet" || normalizedValue === "spreadsheet" || normalizedValue === "table") {
		return "sheet";
	}

	if (normalizedValue === "image") {
		return "image";
	}

	return "text";
}

function parseJsonFromText(rawText) {
	try {
		return JSON.parse(rawText);
	} catch {
		const objectMatch = typeof rawText === "string" ? rawText.match(/\{[\s\S]*\}/) : null;
		if (!objectMatch) {
			return null;
		}

		try {
			return JSON.parse(objectMatch[0]);
		} catch {
			return null;
		}
	}
}

function buildFutureChatArtifactIntentPrompt({
	activeArtifact,
	conversationHistory,
	latestUserMessage,
}) {
	const activeArtifactBlock = activeArtifact
		? [
				"Current open artifact:",
				`- id: ${activeArtifact.id || "unknown"}`,
				`- title: ${activeArtifact.title || "Untitled artifact"}`,
				`- kind: ${activeArtifact.kind || "text"}`,
			].join("\n")
		: "No artifact is currently open.";

	const conversationContext =
		Array.isArray(conversationHistory) && conversationHistory.length > 0
			? conversationHistory
					.map((message) => `${message.type === "assistant" ? "Assistant" : "User"}: ${message.content}`)
					.join("\n")
			: "No previous conversation.";

	return `Classify the user's latest request for a chat app with a document workspace.
Return ONLY valid JSON with this shape:
{
  "action": "chat" | "createDocument" | "updateDocument",
  "title": "string | null",
  "kind": "text" | "code" | "sheet" | "image" | null
}

Rules:
- Use "createDocument" when the user is asking to draft, create, generate, write, make, build, or turn something into a durable artifact/document.
- Use "updateDocument" when an artifact is currently open and the user is asking to revise, rewrite, shorten, expand, polish, convert, format, or otherwise modify that current artifact. Pronoun references like "it", "this", or "that" usually indicate updateDocument when an artifact is open.
- Use "chat" for normal conversational responses, explanations, questions, or analysis that should stay in the transcript.
- Prefer "createDocument" for explicit mentions of "artifact", "document", "memo", "spec", "proposal", "code", "component", "table", or "sheet" unless the user is clearly only asking about them.
- For "updateDocument", preserve the current artifact title unless the user clearly asks to rename it.
- For generic follow-ups like "create an artifact about it", infer a sensible title from the previous conversation instead of echoing that phrase literally.
- Choose kind "code" for coding artifacts, "sheet" for tables/spreadsheets, otherwise "text" unless image creation is explicitly requested.

${activeArtifactBlock}

Conversation context:
${conversationContext}

Latest user request:
${latestUserMessage}`;
}

function parseFutureChatArtifactIntent(rawText, { activeArtifact } = {}) {
	const parsed = parseJsonFromText(rawText);
	if (!parsed || typeof parsed !== "object") {
		return null;
	}

	const rawAction = getNonEmptyString(parsed.action)?.toLowerCase();
	const action =
		rawAction === "createdocument"
			? "createDocument"
			: rawAction === "updatedocument"
				? "updateDocument"
				: rawAction === "chat"
					? "chat"
					: null;
	if (!action) {
		return null;
	}

	const title = getNonEmptyString(parsed.title);
	const kind = parsed.kind == null ? null : normalizeArtifactKind(parsed.kind);

	if (action === "updateDocument" && !activeArtifact?.id) {
		return {
			action: "chat",
			title: null,
			kind: null,
		};
	}

	return {
		action,
		title: title || (action === "updateDocument" ? getNonEmptyString(activeArtifact?.title) : null),
		kind,
	};
}

function fallbackFutureChatArtifactIntent({
	activeArtifact,
	latestUserMessage,
}) {
	const normalizedMessage = getNonEmptyString(latestUserMessage) || "";
	const lowerMessage = normalizedMessage.toLowerCase();
	const hasArtifactWord = /\bartifact\b/.test(lowerMessage);
	const asksForDocument =
		/\b(write|draft|create|build|generate|make|compose|outline|summari[sz]e|plan|design|implement|refactor|turn|convert)\b/.test(
			lowerMessage,
		) &&
		/\b(document|doc|plan|brief|proposal|spec|summary|memo|outline|report|email|copy|article|blog|code|component|app|page|ui|table|spreadsheet|sheet|artifact)\b/.test(
			lowerMessage,
		);
	const asksToModifyCurrentArtifact =
		Boolean(activeArtifact?.id) &&
		/\b(update|edit|revise|rewrite|shorten|expand|polish|refine|change|format|convert|improve|fix)\b/.test(
			lowerMessage,
		);

	if (asksToModifyCurrentArtifact) {
		return {
			action: "updateDocument",
			title: getNonEmptyString(activeArtifact?.title),
			kind: normalizeArtifactKind(activeArtifact?.kind),
		};
	}

	if (hasArtifactWord || asksForDocument) {
		return {
			action: activeArtifact?.id && hasArtifactWord && /\b(it|this|that)\b/.test(lowerMessage)
				? "updateDocument"
				: "createDocument",
			title: getNonEmptyString(activeArtifact?.title),
			kind: /\b(code|component|tsx|jsx|react|javascript|typescript|python|sql|api|function|script|app|ui)\b/.test(lowerMessage)
				? "code"
				: /\b(table|spreadsheet|sheet|csv|matrix|grid)\b/.test(lowerMessage)
					? "sheet"
					: "text",
		};
	}

	return {
		action: "chat",
		title: null,
		kind: null,
	};
}

module.exports = {
	buildFutureChatArtifactIntentPrompt,
	fallbackFutureChatArtifactIntent,
	normalizeArtifactKind,
	parseFutureChatArtifactIntent,
};
