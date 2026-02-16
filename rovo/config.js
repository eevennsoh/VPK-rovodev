/**
 * Rovo Configuration (RovoDev Serve mode)
 *
 * This module provides minimal utilities for chat with RovoDev Serve.
 * System prompts, widget protocols, and plan/ask modes are now handled by RovoDev.
 */

const DEFAULT_MODELS = {
	bedrock: "anthropic.claude-3-5-haiku-20241022-v1:0",
	openai: "gpt-5.2-2025-12-11",
	google: "gemini-3-pro-image-preview",
};

const ROVO_CONFIG = {
	userName: "User",
	userTitle: "Team Member",
};

/**
 * Formats user message with conversation history for RovoDev.
 * RovoDev handles all system prompts and widget protocol.
 */
function buildUserMessage(message, conversationHistory, contextDescription) {
	const baseMessage = contextDescription ? `${contextDescription}\n\nUser question: ${message}` : message;

	if (conversationHistory && conversationHistory.length > 0) {
		return `Previous conversation context:\n${conversationHistory.map((msg) => `${msg.type === "user" ? "User" : "Assistant"}: ${msg.content}`).join("\n")}\n\nCurrent question: ${baseMessage}`;
	}

	return baseMessage;
}

/**
 * Detects endpoint type from gateway URL (for reference only).
 * Not used in RovoDev-only mode.
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
	DEFAULT_MODELS,
	buildUserMessage,
	detectEndpointType,
};
