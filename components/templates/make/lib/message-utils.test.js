const test = require("node:test");
const assert = require("node:assert/strict");

const {
	normalizePlanMessages,
} = require("./message-utils.ts");

test("normalizePlanMessages treats visible clarification-submit messages as planning submissions", () => {
	const messages = [
		{
			id: "user-clarification",
			role: "user",
			metadata: {
				source: "clarification-submit",
			},
			parts: [
				{
					type: "text",
					text: "Requirements captured (2 answers).",
					state: "done",
				},
			],
		},
		{
			id: "assistant-streaming",
			role: "assistant",
			parts: [
				{
					type: "text",
					text: "Drafting the plan...",
					state: "streaming",
				},
			],
		},
	];

	const normalized = normalizePlanMessages(messages, true);
	assert.equal(normalized.length, 1);
	assert.equal(normalized[0].id, "user-clarification");
});

test("normalizePlanMessages does not suppress assistant text without planning submission source", () => {
	const messages = [
		{
			id: "user-regular",
			role: "user",
			parts: [
				{
					type: "text",
					text: "Create an implementation plan",
					state: "done",
				},
			],
		},
		{
			id: "assistant-streaming",
			role: "assistant",
			parts: [
				{
					type: "text",
					text: "Drafting the plan...",
					state: "streaming",
				},
			],
		},
	];

	const normalized = normalizePlanMessages(messages, true);
	assert.equal(normalized.length, 2);
	assert.equal(normalized[1].id, "assistant-streaming");
	assert.equal(normalized[1].parts[0].type, "text");
});
