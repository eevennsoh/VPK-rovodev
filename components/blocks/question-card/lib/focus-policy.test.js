const test = require("node:test");
const assert = require("node:assert/strict");

const { shouldAutoFocusCustomInputForQuestion } = require("./focus-policy.ts");

test("auto-focuses custom input when a question has no visible generated options", () => {
	assert.equal(
		shouldAutoFocusCustomInputForQuestion({
			optionCount: 0,
			maxVisibleOptions: 4,
			showCustomInput: true,
		}),
		true,
	);
});

test("does not auto-focus custom input when generated options are visible", () => {
	assert.equal(
		shouldAutoFocusCustomInputForQuestion({
			optionCount: 2,
			maxVisibleOptions: 4,
			showCustomInput: true,
		}),
		false,
	);
});

test("does not auto-focus custom input when custom input is disabled", () => {
	assert.equal(
		shouldAutoFocusCustomInputForQuestion({
			optionCount: 0,
			maxVisibleOptions: 4,
			showCustomInput: false,
		}),
		false,
	);
});
