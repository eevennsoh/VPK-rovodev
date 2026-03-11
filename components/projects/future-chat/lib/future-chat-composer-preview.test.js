const test = require("node:test");
const assert = require("node:assert/strict");

const {
	resolveFutureChatComposerPreviewHeight,
} = require("./future-chat-composer-preview.ts");

test("resolveFutureChatComposerPreviewHeight preserves the base height for short previews", () => {
	assert.equal(
		resolveFutureChatComposerPreviewHeight({
			baseComposerHeight: 108,
			baseTextareaHeight: 24,
			previewPromptHeight: 20,
		}),
		108,
	);
});

test("resolveFutureChatComposerPreviewHeight grows the composer for tall preview prompts", () => {
	assert.equal(
		resolveFutureChatComposerPreviewHeight({
			baseComposerHeight: 108,
			baseTextareaHeight: 24,
			previewPromptHeight: 72,
		}),
		156,
	);
});

test("resolveFutureChatComposerPreviewHeight returns null for incomplete measurements", () => {
	assert.equal(
		resolveFutureChatComposerPreviewHeight({
			baseComposerHeight: 0,
			baseTextareaHeight: 24,
			previewPromptHeight: 72,
		}),
		null,
	);
});
