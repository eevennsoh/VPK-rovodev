/**
 * Rovo configuration helpers.
 *
 * Model routing/defaults are defined in backend AI Gateway helpers.
 * This module only owns user-message formatting for RovoDev chat calls.
 */

/**
 * Instruction appended to every RovoDev message so the agent uses the
 * structured `request_user_input` tool instead of plain-text questions.
 *
 * The backend intercepts `request_user_input` tool calls and renders
 * them as interactive question-card widgets in the chat UI.
 */
const REQUEST_USER_INPUT_INSTRUCTION = [
	"[Clarification Protocol]",
	"When you need to ask the user clarifying questions before proceeding (e.g. to gather requirements, preferences, or missing details), you MUST use the `request_user_input` tool instead of writing questions as plain text.",
	"The tool renders an interactive question card in the UI. Provide 2–4 questions, each with a short label, description, and 1–3 predefined options. The UI automatically appends a free-text option.",
	"Each option must be a specific, concrete answer to its question (e.g. site names, technologies, team names) — never generic labels like \"Quick\", \"Balanced\", or \"Detailed\".",
	"Only skip the tool when you are asking a single simple yes/no follow-up or making a casual conversational remark.",
	"[End Clarification Protocol]",
].join("\n");

/**
 * System message sent to RovoDev when the user skips/dismisses a
 * Question Card without providing answers. RovoDev can then decide
 * whether to ask differently, proceed with caveats, or explain why
 * more context is needed.
 *
 * @param {string} [questionTitle] - The title of the dismissed Question Card.
 * @returns {string} The skip notification message.
 */
function buildQuestionCardSkipNotification(questionTitle) {
	const titleContext = questionTitle
		? ` (titled "${questionTitle}")`
		: "";
	return [
		"[Question Card Dismissed]",
		`The user skipped the clarification question card${titleContext} without providing answers.`,
		"You may either:",
		"1. Explain what specific information you need and why it matters, then offer a simpler way to provide it.",
		"2. Proceed with reasonable default assumptions and clearly state what assumptions you are making.",
		"Choose the approach that best serves the user's original request.",
		"[End Question Card Dismissed]",
	].join("\n");
}

/**
 * Formats user message with conversation history for RovoDev.
 * RovoDev handles all system prompts and widget protocol.
 */
function buildUserMessage(message, conversationHistory, contextDescription) {
	const combinedContext = contextDescription
		? `${contextDescription}\n\n${REQUEST_USER_INPUT_INSTRUCTION}`
		: REQUEST_USER_INPUT_INSTRUCTION;
	const baseMessage = `${combinedContext}\n\nUser question: ${message}`;

	if (conversationHistory && conversationHistory.length > 0) {
		return `Previous conversation context:\n${conversationHistory.map((msg) => `${msg.type === "user" ? "User" : "Assistant"}: ${msg.content}`).join("\n")}\n\nCurrent question: ${baseMessage}`;
	}

	return baseMessage;
}

module.exports = {
	buildUserMessage,
	buildQuestionCardSkipNotification,
};
