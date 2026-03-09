const { getNonEmptyString } = require("./shared-utils");
const {
	extractFutureChatRequestedTitle,
	isExplicitNewFutureChatArtifactRequest,
	isSameFutureChatArtifactVersionRequest,
} = require("./future-chat-artifact-updates");
const {
	inferFutureChatArtifactKindFromRequest,
	normalizeFutureChatArtifactKind,
} = require("./future-chat-artifact-kind");

function normalizeArtifactKind(value) {
	return normalizeFutureChatArtifactKind(value);
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
	artifactSteering,
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
	const steeringContext =
		artifactSteering?.preferCurrentArtifact && activeArtifact?.id
			? [
					"Voice steering context:",
					"- This request arrived as a live steering update while the current artifact workspace was active.",
					"- If the request is ambiguous, prefer updateDocument over chat or createDocument.",
					"- Only choose createDocument when the user clearly asks for a new/separate artifact.",
				].join("\n")
			: null;

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
- When an artifact is currently open, requests to turn it into a report, translate it, compare or add detail to it, or otherwise transform that same artifact should stay in updateDocument and create a new version instead of a new artifact.
- Use "chat" for normal conversational responses, explanations, questions, or analysis that should stay in the transcript.
- Prefer "createDocument" for explicit mentions of "artifact", "document", "memo", "spec", "proposal", "code", "component", "table", or "sheet" unless the user is clearly only asking about them.
- For "updateDocument", preserve the current artifact title unless the user clearly asks to rename it.
- For generic follow-ups like "create an artifact about it", infer a sensible title from the previous conversation instead of echoing that phrase literally.
- Choose kind "code" for coding artifacts, "sheet" for tables/spreadsheets, otherwise "text" unless image creation is explicitly requested.

${activeArtifactBlock}

${steeringContext ? `${steeringContext}\n` : ""}

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
	artifactSteering,
	latestUserMessage,
}) {
	const normalizedMessage = getNonEmptyString(latestUserMessage) || "";
	const lowerMessage = normalizedMessage.toLowerCase();
	const prefersCurrentArtifact =
		Boolean(activeArtifact?.id) && artifactSteering?.preferCurrentArtifact === true;
	const sameArtifactVersionRequest = isSameFutureChatArtifactVersionRequest({
		activeArtifact,
		latestUserMessage,
	});
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
	const requestedTitle = extractFutureChatRequestedTitle({
		latestUserMessage,
	});
	const explicitlyRequestsNewArtifact = isExplicitNewFutureChatArtifactRequest({
		latestUserMessage,
	});

	if (asksToModifyCurrentArtifact || sameArtifactVersionRequest) {
		return {
			action: "updateDocument",
			title: requestedTitle || getNonEmptyString(activeArtifact?.title),
			kind: normalizeArtifactKind(activeArtifact?.kind),
		};
	}

	if (hasArtifactWord || asksForDocument) {
		const action =
			activeArtifact?.id && hasArtifactWord && /\b(it|this|that)\b/.test(lowerMessage)
				? "updateDocument"
				: "createDocument";
		return {
			action,
			title:
				action === "updateDocument"
					? requestedTitle || getNonEmptyString(activeArtifact?.title)
					: null,
			kind: inferFutureChatArtifactKindFromRequest(latestUserMessage),
			};
	}

	if (
		prefersCurrentArtifact &&
		!explicitlyRequestsNewArtifact &&
		normalizedMessage &&
		!/[?]\s*$/u.test(normalizedMessage)
	) {
		return {
			action: "updateDocument",
			title: requestedTitle || getNonEmptyString(activeArtifact?.title),
			kind: normalizeArtifactKind(activeArtifact?.kind),
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
