/**
 * Rovo Configuration
 *
 * This module provides the system prompt builder and user message formatter
 * for AI Gateway calls. Used by both the Express backend and the AI SDK provider.
 *
 * Supported endpoints:
 * - Bedrock (Claude) via OpenAI-compatible format
 * - OpenAI (GPT)
 * - Google (Gemini)
 *
 * Default: Claude via Bedrock (anthropic.claude-3-5-haiku-20241022-v1:0)
 */

// Default models - update these to change the default model for each provider
const DEFAULT_MODELS = {
	bedrock: "anthropic.claude-3-5-haiku-20241022-v1:0", // Model ID is in the URL for Bedrock
	openai: "gpt-5.2-2025-12-11",
	google: "gemini-3-pro-image-preview", // Gemini image generation via AI Gateway /v1/google/v1/chat/completions
};

const ROVO_CONFIG = {
	userName: "User",
	userTitle: "Team Member",
};

const ROVO_CHAT_MODES = {
	PLAN: "plan",
	ASK: "ask",
};

function normalizeChatMode(chatMode) {
	return chatMode === ROVO_CHAT_MODES.ASK
		? ROVO_CHAT_MODES.ASK
		: ROVO_CHAT_MODES.PLAN;
}

function buildSystemPrompt(userName, customSystemPrompt, chatMode, endpointTypeOverride) {
	if (customSystemPrompt && customSystemPrompt.trim()) {
		return customSystemPrompt.trim();
	}

	const resolvedChatMode = normalizeChatMode(chatMode);
	const currentDate = new Date().toLocaleString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		timeZoneName: "short",
	});

	const userContext = userName ? `\n- User's Name: ${userName}` : "";
	const personalizationRule = userName
		? `\n- When appropriate, you may address the user by their first name (${userName.split(" ")[0]}) to create a more personalized experience, but don't overuse it`
		: "";
	const endpointType = endpointTypeOverride || detectEndpointType();
	const supportsImageGeneration = endpointType === "google";

	const widgetProtocolSection = resolvedChatMode === ROVO_CHAT_MODES.PLAN
		? `

## Widget Protocol
- Always ask clarification questions first using a question-card widget before producing plan tasks.
- Emit question-card exactly in this order:
  1) WIDGET_LOADING:question-card
  2) WIDGET_DATA:{"type":"question-card","title":"string","description":"string","sessionId":"string","round":1,"maxRounds":3,"questions":[{"id":"string","label":"string","description":"string","required":true,"kind":"single-select","options":[{"id":"string","label":"string","description":"string","recommended":true}],"placeholder":"Tell Rovo what to do..."}]}
- For each clarification question, include 1-3 generated options only.
- The UI renders option 4 as a free-text input with placeholder "Tell Rovo what to do...".
- Only when clarification answers are provided in the context, emit the plan widget:
  1) THINKING_STATUS:{"label":"<contextual thinking label>","content":"<contextual description of what you're doing>"}
  2) WIDGET_LOADING:plan
  3) WIDGET_DATA:{"type":"plan","title":"string","description":"string","emoji":"single emoji","tasks":[{"id":"task-1","label":"task label","agent":"Agent Name","blockedBy":[]},{"id":"task-2","label":"task label","agent":"Agent Name","blockedBy":["task-1"]}]}
- Each task must have a unique id (format: task-1, task-2, etc.), a short label, an agent name (the specialist role responsible), and a blockedBy array of prerequisite task IDs (empty array if none).
- Maximize parallelism: only add a blockedBy entry when a task truly depends on another task's output. Tasks that can run independently should have empty blockedBy arrays.
- After emitting the plan widget, emit a mermaid diagram showing task dependencies as a directed graph. Group tasks by assigned agent using subgraphs. Example:
  \`\`\`mermaid
  graph TD
    subgraph Researcher
      T1["1. Research competitors"]
    end
    subgraph Copywriter
      T2["2. Draft copy"]
    end
    subgraph Designer
      T3["3. Design mockups"]
    end
    T1 --> T2
    T1 --> T3
  \`\`\`
  Tasks with no dependencies are entry points at the top. Edges go from blocker to blocked task.
- When emitting THINKING_STATUS before a plan, vary the label and content to reflect what you're actually doing. Examples: {"label":"Drafting your plan","content":"Analyzing your preferences and organizing tasks..."}, {"label":"Building your task list","content":"Turning your answers into actionable steps..."}. Do not reuse the same label every time.
- When emitting any widget, keep your text response to a single brief sentence introducing it. Do not list or describe the widget contents in your text — the widget card will display them. Do not add follow-up questions or offers to help after the widget.
- If context includes a plan approval submission, continue from the existing plan and do not emit a question-card widget unless the user explicitly asks to restart planning.
- Keep questions and tasks short, actionable, and ordered.
- Do not wrap widget JSON in markdown code fences.`
		: supportsImageGeneration
			? `

## Output Protocol
- Respond as plain conversational markdown text only, unless the user asks you to generate, create, draw, or make an image.
- When the user requests image generation, generate the image directly using your native image generation capabilities. Do not describe the image, provide code, or suggest alternatives — generate the actual image.
- Do not emit widget markers such as WIDGET_LOADING or WIDGET_DATA.`
			: `

## Output Protocol
- Respond as plain conversational markdown text only.
- Do not emit widget markers such as WIDGET_LOADING or WIDGET_DATA.`;

	return `You are an AI assistant built by Atlassian.

## Context
- Current Date/Time: ${currentDate}
- Organization: Atlassian${userContext}

## Your Capabilities

You are a helpful AI assistant that can answer questions, help with tasks, and provide information.

## Response Guidelines
- Be conversational, helpful, and professional${personalizationRule}
- **Keep responses concise - aim for 200 words or less whenever possible**
- Use markdown formatting for clarity (bold key points, use lists, add headings for structure)
- Prioritize brevity and clarity over exhaustive detail
${widgetProtocolSection}`;
}

function buildUserMessage(message, conversationHistory, contextDescription) {
	const baseMessage = contextDescription ? `${contextDescription}\n\nUser question: ${message}` : message;

	if (conversationHistory && conversationHistory.length > 0) {
		return `Previous conversation context:\n${conversationHistory.map((msg) => `${msg.type === "user" ? "User" : "Assistant"}: ${msg.content}`).join("\n")}\n\nCurrent question: ${baseMessage}`;
	}

	return baseMessage;
}

/**
 * Detects the endpoint type from a gateway URL.
 * @param {string} [url] - Optional URL to inspect. Falls back to AI_GATEWAY_URL env var.
 * @returns {'bedrock' | 'openai' | 'google'}
 */
function detectEndpointType(url) {
	const aiGatewayUrl = url || process.env.AI_GATEWAY_URL || "";
	if (/\/v1\/bedrock\/model\//.test(aiGatewayUrl)) {
		return "bedrock";
	}
	if (/\/v1\/google\//.test(aiGatewayUrl)) {
		return "google";
	}
	return "openai";
}

module.exports = {
	ROVO_CONFIG,
	ROVO_CHAT_MODES,
	DEFAULT_MODELS,
	normalizeChatMode,
	buildSystemPrompt,
	buildUserMessage,
	detectEndpointType,
};
