const assert = require("node:assert/strict");
const test = require("node:test");

const {
	getFutureChatShellLayout,
} = require("./future-chat-shell-layout.ts");

test("uses overlay mode below the mobile breakpoint", () => {
	const layout = getFutureChatShellLayout(767);

	assert.equal(layout.mode, "overlay");
	assert.equal(layout.chatPaneWidth, null);
	assert.equal(layout.artifactPaneX, 0);
	assert.equal(layout.artifactPaneWidth, 767);
});

test("uses overlay mode when split panes would be too cramped", () => {
	const layout = getFutureChatShellLayout(790);

	assert.equal(layout.mode, "overlay");
	assert.equal(layout.chatPaneWidth, null);
	assert.equal(layout.artifactPaneX, 0);
	assert.equal(layout.artifactPaneWidth, 790);
});

test("keeps split panes aligned on desktop widths", () => {
	const layout = getFutureChatShellLayout(980);

	assert.equal(layout.mode, "split");
	assert.equal(layout.chatPaneWidth, 412);
	assert.equal(layout.artifactPaneX, 412);
	assert.equal(layout.artifactPaneWidth, 568);
	assert.equal(layout.chatPaneWidth + layout.artifactPaneWidth, 980);
});

test("clamps the chat pane width on wide screens", () => {
	const layout = getFutureChatShellLayout(1600);

	assert.equal(layout.mode, "split");
	assert.equal(layout.chatPaneWidth, 560);
	assert.equal(layout.artifactPaneX, 560);
	assert.equal(layout.artifactPaneWidth, 1040);
});

