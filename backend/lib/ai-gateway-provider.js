/**
 * Stub AI Gateway provider - RovoDev only mode
 * This file exists only to satisfy genui-chat-handler dependencies.
 * Genui features are not fully supported in RovoDev-only mode.
 */

function createAIGatewayProvider() {
	throw new Error(
		"AI Gateway provider is not available in RovoDev-only mode. " +
		"The /api/genui-chat endpoint requires AI Gateway configuration which is no longer supported. " +
		"Please use RovoDev Serve for chat functionality."
	);
}

module.exports = {
	createAIGatewayProvider,
};
