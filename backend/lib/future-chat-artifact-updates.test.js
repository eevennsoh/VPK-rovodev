const test = require("node:test");
const assert = require("node:assert/strict");

const {
	applyFutureChatArtifactTitleRename,
	deriveFutureChatVersionChangeLabel,
	extractFutureChatRequestedTitle,
	isExplicitNewFutureChatArtifactRequest,
	isRenameOnlyFutureChatArtifactRequest,
	isSameFutureChatArtifactVersionRequest,
} = require("./future-chat-artifact-updates");

test("isRenameOnlyFutureChatArtifactRequest detects rename-only title updates", () => {
	assert.equal(
		isRenameOnlyFutureChatArtifactRequest({
			latestUserMessage: "Can you change the title to The Orange That Changed the World?",
			nextTitle: "The Orange That Changed the World",
			previousTitle: "About Orange",
		}),
		true,
	);
});

test("isRenameOnlyFutureChatArtifactRequest rejects title changes with additional edit instructions", () => {
	assert.equal(
		isRenameOnlyFutureChatArtifactRequest({
			latestUserMessage: "Change the title to The Orange That Changed the World and make it shorter.",
			nextTitle: "The Orange That Changed the World",
			previousTitle: "About Orange",
		}),
		false,
	);
});

test("extractFutureChatRequestedTitle pulls the requested rename target from follow-up prompts", () => {
	assert.equal(
		extractFutureChatRequestedTitle({
			latestUserMessage: "Change the title to Apple Future",
		}),
		"Apple Future",
	);
	assert.equal(
		extractFutureChatRequestedTitle({
			latestUserMessage: "Rename it to \"The Orange That Changed the World\".",
		}),
		"The Orange That Changed the World",
	);
	assert.equal(
		extractFutureChatRequestedTitle({
			latestUserMessage: "Change the title to The Orange That Changed the World and make it shorter.",
		}),
		"The Orange That Changed the World",
	);
});

test("isSameFutureChatArtifactVersionRequest keeps report conversions on the current artifact", () => {
	assert.equal(
		isSameFutureChatArtifactVersionRequest({
			activeArtifact: {
				id: "doc-1",
				title: "About Orange",
			},
			latestUserMessage: "Can you turn it into a report?",
		}),
		true,
	);
});

test("isSameFutureChatArtifactVersionRequest allows explicit new artifacts to break out", () => {
	assert.equal(
		isSameFutureChatArtifactVersionRequest({
			activeArtifact: {
				id: "doc-1",
				title: "About Orange",
			},
			latestUserMessage: "Create a new artifact about apples instead.",
		}),
		false,
	);
	assert.equal(
		isExplicitNewFutureChatArtifactRequest({
			latestUserMessage: "Create a new artifact about apples instead.",
		}),
		true,
	);
});

test("applyFutureChatArtifactTitleRename replaces the leading markdown title when it matches the previous title", () => {
	const nextContent = applyFutureChatArtifactTitleRename({
		content: "# About Orange\n\nBody copy stays here.",
		nextTitle: "The Orange That Changed the World",
		previousTitle: "About Orange",
	});

	assert.equal(
		nextContent,
		"# The Orange That Changed the World\n\nBody copy stays here.",
	);
});

test("applyFutureChatArtifactTitleRename leaves content untouched when the old title is not present as the leading title", () => {
	const content = "A Rich History\n\nAbout Orange was widely cultivated...";

	assert.equal(
		applyFutureChatArtifactTitleRename({
			content,
			nextTitle: "The Orange That Changed the World",
			previousTitle: "About Orange",
		}),
		content,
	);
});

test("deriveFutureChatVersionChangeLabel returns readable labels for common update types", () => {
	assert.equal(
		deriveFutureChatVersionChangeLabel({
			artifactAction: "updateDocument",
			latestUserMessage: "Can you turn it into a report?",
		}),
		"Turned into report",
	);
	assert.equal(
		deriveFutureChatVersionChangeLabel({
			artifactAction: "updateDocument",
			latestUserMessage: "Can you translate it into Chinese?",
		}),
		"Translated",
	);
	assert.equal(
		deriveFutureChatVersionChangeLabel({
			artifactAction: "updateDocument",
			artifactSteering: { source: "voice" },
			latestUserMessage: "make this tighter",
		}),
		"Steered update",
	);
});
