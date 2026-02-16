/**
 * Stub AI Gateway helpers - RovoDev only mode
 * This file exists only to satisfy genui-chat-handler dependencies.
 * Genui features are not fully supported in RovoDev-only mode.
 */

function getEnvVars() {
	throw new Error(
		"AI Gateway is not available in RovoDev-only mode. " +
		"Please use RovoDev Serve for chat functionality."
	);
}

function detectEndpointType() {
	throw new Error("AI Gateway is not available in RovoDev-only mode");
}

function resolveGatewayUrl() {
	throw new Error("AI Gateway is not available in RovoDev-only mode");
}

function streamBedrockGatewayManualSse() {
	throw new Error("AI Gateway is not available in RovoDev-only mode");
}

function streamGoogleGatewayManualSse() {
	throw new Error("AI Gateway is not available in RovoDev-only mode");
}

function getGatewayHeaders() {
	throw new Error("AI Gateway is not available in RovoDev-only mode");
}

function getModelId() {
	throw new Error("AI Gateway is not available in RovoDev-only mode");
}

function getAuthToken() {
	throw new Error("AI Gateway is not available in RovoDev-only mode");
}

module.exports = {
	getEnvVars,
	detectEndpointType,
	resolveGatewayUrl,
	streamBedrockGatewayManualSse,
	streamGoogleGatewayManualSse,
	getGatewayHeaders,
	getModelId,
	getAuthToken,
};
