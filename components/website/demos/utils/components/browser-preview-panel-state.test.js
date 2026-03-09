const test = require("node:test");
const assert = require("node:assert/strict");

const {
	getBrowserPreviewRenderMode,
} = require("./browser-preview-panel-state.ts");

test("prefers embedded chromium preview when a navigable url is available", () => {
	assert.equal(
		getBrowserPreviewRenderMode(
			"https://theverge.com",
			"/screenshots/theverge.png",
		),
		"embedded",
	);
});

test("falls back to artifact screenshot when no navigable url is available", () => {
	assert.equal(
		getBrowserPreviewRenderMode(null, "/screenshots/theverge.png"),
		"artifact",
	);
});

test("shows empty state when neither live url nor screenshot exists", () => {
	assert.equal(
		getBrowserPreviewRenderMode(null, null),
		"empty",
	);
});
