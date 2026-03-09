const test = require("node:test");
const assert = require("node:assert/strict");

const {
	inferFutureChatArtifactKindFromContent,
	inferFutureChatArtifactKindFromRequest,
} = require("./future-chat-artifact-kind");

test("inferFutureChatArtifactKindFromRequest treats page requests as code artifacts", () => {
	assert.equal(
		inferFutureChatArtifactKindFromRequest("Create me a page about Apple"),
		"code",
	);
	assert.equal(
		inferFutureChatArtifactKindFromRequest("Build a website landing page for oranges"),
		"code",
	);
});

test("inferFutureChatArtifactKindFromRequest keeps table requests as sheets", () => {
	assert.equal(
		inferFutureChatArtifactKindFromRequest("Create a comparison table of apple varieties"),
		"sheet",
	);
});

test("inferFutureChatArtifactKindFromContent upgrades HTML output to code", () => {
	assert.equal(
		inferFutureChatArtifactKindFromContent("<!DOCTYPE html><html><head><title>Apple</title></head><body></body></html>", "text"),
		"code",
	);
});

test("inferFutureChatArtifactKindFromContent keeps markdown tables as sheets", () => {
	assert.equal(
		inferFutureChatArtifactKindFromContent("| Fruit | Color |\n| --- | --- |\n| Apple | Red |", "text"),
		"sheet",
	);
});
