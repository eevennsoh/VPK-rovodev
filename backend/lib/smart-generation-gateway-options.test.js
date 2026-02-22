const test = require("node:test");
const assert = require("node:assert/strict");

const {
	normalizeSmartGenerationProvider,
	normalizeSmartGenerationPortIndex,
	buildSmartGenerationGatewayOptions,
} = require("./smart-generation-gateway-options");

test("normalizeSmartGenerationProvider returns non-empty string values", () => {
	assert.equal(normalizeSmartGenerationProvider("openai"), "openai");
	assert.equal(normalizeSmartGenerationProvider("  anthropic  "), "anthropic");
	assert.equal(normalizeSmartGenerationProvider(""), undefined);
	assert.equal(normalizeSmartGenerationProvider("   "), undefined);
	assert.equal(normalizeSmartGenerationProvider(null), undefined);
});

test("normalizeSmartGenerationPortIndex accepts non-negative integers only", () => {
	assert.equal(normalizeSmartGenerationPortIndex(0), 0);
	assert.equal(normalizeSmartGenerationPortIndex(2), 2);
	assert.equal(normalizeSmartGenerationPortIndex(-1), undefined);
	assert.equal(normalizeSmartGenerationPortIndex(1.5), undefined);
	assert.equal(normalizeSmartGenerationPortIndex("1"), undefined);
});

test("buildSmartGenerationGatewayOptions forwards provider, portIndex, and signal", () => {
	const controller = new AbortController();
	const options = buildSmartGenerationGatewayOptions({
		provider: "google",
		portIndex: 3,
		signal: controller.signal,
	});

	assert.equal(options.provider, "google");
	assert.equal(options.portIndex, 3);
	assert.equal(options.signal, controller.signal);
});

test("buildSmartGenerationGatewayOptions omits invalid values", () => {
	const options = buildSmartGenerationGatewayOptions({
		provider: "   ",
		portIndex: -2,
	});

	assert.deepEqual(options, {});
});
