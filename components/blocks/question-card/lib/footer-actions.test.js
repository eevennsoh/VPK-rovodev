const test = require("node:test");
const assert = require("node:assert/strict");

const { getQuestionCardPrimaryAction } = require("./footer-actions.ts");

test("keeps Skip as the footer action while answers are incomplete", () => {
	assert.equal(getQuestionCardPrimaryAction(false), "skip");
});

test("switches footer action to Submit only after all questions are answered", () => {
	assert.equal(getQuestionCardPrimaryAction(true), "submit");
});
