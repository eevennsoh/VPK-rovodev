/**
 * Rovo configuration helpers.
 *
 * Model routing/defaults are defined in backend AI Gateway helpers.
 * This module only owns user-message formatting for RovoDev chat calls.
 */

/**
 * Instruction appended to every RovoDev message so the agent uses the
 * structured `ask_user_questions` tool instead of plain-text questions.
 *
 * The backend intercepts `ask_user_questions` tool calls and renders
 * them as interactive question-card widgets in the chat UI.
 */
const REQUEST_USER_INPUT_INSTRUCTION = [
	"[Clarification Protocol]",
	"When you need to ask the user clarifying questions before proceeding (e.g. to gather requirements, preferences, or missing details), you MUST use the `ask_user_questions` tool instead of writing questions as plain text.",
	"The tool renders an interactive question card in the UI. Provide 2–4 questions, each with a short label, description, and 1–3 predefined options. The UI automatically appends a free-text option.",
	"Each option must be a specific, concrete answer to its question (e.g. site names, technologies, team names) — never generic labels like \"Quick\", \"Balanced\", or \"Detailed\".",
	"Skip the tool for deterministic requests that can be completed directly without external systems (e.g. translation, rewrite, summarization, formatting).",
	"Only use the tool when missing details genuinely block completion, or when asking a single simple yes/no follow-up or making a casual conversational remark.",
	"[End Clarification Protocol]",
].join("\n");

const FIGMA_CLARIFICATION_INSTRUCTION = [
	"[Figma Tool Protocol]",
	"When the user mentions Figma, design context, or asks about a Figma design, you MUST first use the `ask_user_questions` tool to gather the following before calling any Figma MCP tools:",
	"- Question 1: \"Which Figma file should I look at?\" — Ask for the Figma URL or file key. Provide options if you can infer likely files from context.",
	"- Question 2: \"What would you like me to do with this design?\" — Offer options like: \"Extract design specs\", \"Generate implementation code\", \"Review layout and spacing\", \"Extract design tokens\".",
	"Only after the user answers these questions should you call `get_design_context`, `get_screenshot`, or other Figma MCP tools with the provided details.",
	"Do NOT call Figma MCP tools without first collecting the Figma URL from the user.",
	"[End Figma Tool Protocol]",
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
	const instructions = `${REQUEST_USER_INPUT_INSTRUCTION}\n\n${FIGMA_CLARIFICATION_INSTRUCTION}`;
	const combinedContext = contextDescription
		? `${contextDescription}\n\n${instructions}`
		: instructions;
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
