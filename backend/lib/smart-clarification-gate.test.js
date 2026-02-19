const test = require("node:test");
const assert = require("node:assert/strict");

const {
	buildClassifierPrompt,
	parseClassifierOutput,
	shouldGateSmartClarification,
} = require("./smart-clarification-gate");

test("parseClassifierOutput parses JSON", () => {
	const parsed = parseClassifierOutput(
		'{"needsClarification":false,"confidence":0.82,"reason":"enough context"}'
	);
	assert.equal(parsed.needsClarification, false);
	assert.equal(parsed.confidence, 0.82);
	assert.equal(parsed.reason, "enough context");
});

test("parseClassifierOutput handles keyword fallback", () => {
	const parsed = parseClassifierOutput("Sufficient context, proceed");
	assert.equal(parsed.needsClarification, false);
});

test("shouldGateSmartClarification does NOT gate conversational messages", () => {
	// "hey there" has intent=normal → should not be gated
	assert.equal(
		shouldGateSmartClarification({
			latestUserMessage: "hey there",
			latestUserMessageSource: null,
			smartGenerationActive: true,
			smartIntentResult: { intent: "normal" },
			classifierResult: { needsClarification: true },
		}),
		false
	);

	// "how r u" has intent=normal → should not be gated
	assert.equal(
		shouldGateSmartClarification({
			latestUserMessage: "how r u",
			latestUserMessageSource: null,
			smartGenerationActive: true,
			smartIntentResult: { intent: "normal" },
			classifierResult: { needsClarification: true },
		}),
		false
	);
});

test("shouldGateSmartClarification does NOT gate when no smartIntentResult", () => {
	assert.equal(
		shouldGateSmartClarification({
			latestUserMessage: "chart",
			latestUserMessageSource: null,
			smartGenerationActive: true,
			smartIntentResult: null,
			classifierResult: { needsClarification: true },
		}),
		false
	);
});

test("shouldGateSmartClarification skips after clarification-submit", () => {
	assert.equal(
		shouldGateSmartClarification({
			latestUserMessage: "give me a chart",
			latestUserMessageSource: "clarification-submit",
			smartGenerationActive: true,
			smartIntentResult: { intent: "genui" },
			classifierResult: { needsClarification: true },
		}),
		false
	);
});

test("shouldGateSmartClarification gates vague generative requests", () => {
	// Vague chart request with genui intent + classifier says needs clarification
	assert.equal(
		shouldGateSmartClarification({
			latestUserMessage: "Give me a chart of revenue",
			latestUserMessageSource: null,
			smartGenerationActive: true,
			smartIntentResult: { intent: "genui" },
			classifierResult: { needsClarification: true },
		}),
		true
	);

	// Image request with classifier saying needs clarification
	assert.equal(
		shouldGateSmartClarification({
			latestUserMessage: "generate an image",
			latestUserMessageSource: null,
			smartGenerationActive: true,
			smartIntentResult: { intent: "image" },
			classifierResult: { needsClarification: true },
		}),
		true
	);
});

test("shouldGateSmartClarification does NOT gate detailed generative requests", () => {
	assert.equal(
		shouldGateSmartClarification({
			latestUserMessage: "Plot monthly revenue by region for 2024",
			latestUserMessageSource: null,
			smartGenerationActive: true,
			smartIntentResult: { intent: "genui" },
			classifierResult: { needsClarification: false },
		}),
		false
	);
});

test("buildClassifierPrompt includes key sections", () => {
	const prompt = buildClassifierPrompt({
		latestUserMessage: "give me a chart",
		conversationHistory: [
			{ type: "user", content: "hello" },
			{ type: "assistant", content: "hi" },
		],
		smartIntentHint: "genui",
		layoutContext: { surface: "multiports", widthClass: "compact" },
	});
	assert.match(prompt, /Latest user request:/);
	assert.match(prompt, /give me a chart/);
	assert.match(prompt, /Smart intent hint: genui/);
	assert.match(prompt, /Layout context:/);
});
