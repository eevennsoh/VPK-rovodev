const { createOpenAICompatible } = require("@ai-sdk/openai-compatible");
const {
	getAuthToken,
	getEnvVars,
	detectEndpointType,
	getModelId,
	resolveBaseURL,
} = require("./ai-gateway-helpers");

/**
 * Creates an AI SDK provider that wraps the Atlassian AI Gateway.
 *
 * All three endpoint types (Bedrock, OpenAI, Google) are accessed via
 * OpenAI-compatible chat completions format. Legacy Bedrock invoke URLs
 * are auto-translated to the OpenAI-compatible format.
 *
 * @param {object} [overrides]
 * @param {string} [overrides.gatewayUrl] - Override the AI_GATEWAY_URL.
 * @param {string} [overrides.endpointType] - Force endpoint type detection.
 * @returns {{ provider: ReturnType<typeof createOpenAICompatible>, modelId: string, endpointType: string }}
 */
function createAIGatewayProvider(overrides = {}) {
	const envVars = getEnvVars();
	const rawGatewayUrl = overrides.gatewayUrl || envVars.AI_GATEWAY_URL;
	const endpointType = overrides.endpointType || detectEndpointType(rawGatewayUrl);
	const modelId = getModelId(rawGatewayUrl);
	const baseURL = resolveBaseURL(rawGatewayUrl);

	if (!baseURL) {
		throw new Error("Cannot create AI Gateway provider: no gateway URL configured");
	}

	// Some OpenAI models (gpt-5.2+) require max_completion_tokens instead of
	// max_tokens. The SDK always sends max_tokens, so we rewrite the request
	// body for models that need the newer parameter.
	const needsMaxCompletionTokens =
		endpointType === "openai" && /\bgpt-(?:5|o[1-9])/.test(modelId);

	const provider = createOpenAICompatible({
		name: "ai-gateway",
		baseURL,
		fetch: async (url, init) => {
			const token = await getAuthToken();
			const existingHeaders = init?.headers
				? Object.fromEntries(new Headers(init.headers).entries())
				: {};

			const headers = {
				...existingHeaders,
				authorization: `bearer ${token}`,
				"x-atlassian-usecaseid": envVars.AI_GATEWAY_USE_CASE_ID,
				"x-atlassian-cloudid": envVars.AI_GATEWAY_CLOUD_ID,
				"x-atlassian-userid": envVars.AI_GATEWAY_USER_ID,
			};

			let body = init?.body;
			if (needsMaxCompletionTokens && body) {
				try {
					const parsed = JSON.parse(body);
					if ("max_tokens" in parsed) {
						parsed.max_completion_tokens = parsed.max_tokens;
						delete parsed.max_tokens;
						body = JSON.stringify(parsed);
					}
				} catch {
					// Not JSON or parse failed — send as-is
				}
			}

			return fetch(url, { ...init, body, headers });
		},
	});

	return { provider, modelId, endpointType };
}

module.exports = {
	createAIGatewayProvider,
};
