const test = require("node:test");
const assert = require("node:assert/strict");

const {
	hasRecoveredPlaceholderSection,
	assessToolFirstGenuiQuality,
} = require("./tool-first-genui-quality");

test("hasRecoveredPlaceholderSection detects synthesized placeholder cards", () => {
	const spec = {
		root: "root",
		elements: {
			root: {
				type: "Stack",
				props: {},
				children: ["card-1"],
			},
			"card-1": {
				type: "Card",
				props: {
					title: "Generated section",
					description: "Recovered from incomplete model output.",
				},
				children: [],
			},
		},
	};

	assert.equal(hasRecoveredPlaceholderSection(spec), true);
});

test("assessToolFirstGenuiQuality marks synthesized specs as low confidence", () => {
	const synthesizedSpec = {
		root: "root",
		elements: {
			root: {
				type: "Stack",
				props: {},
				children: ["card-1"],
			},
			"card-1": {
				type: "Card",
				props: {
					title: "Generated section",
					description: "Recovered from incomplete model output.",
				},
				children: [],
			},
		},
	};
	const analysis = {
		synthesizedChildCount: 1,
		missingChildKeys: ["missing-child-a"],
		synthesizedSpec,
	};

	const result = assessToolFirstGenuiQuality({
		analysis,
		spec: synthesizedSpec,
	});

	assert.equal(result.quality, "low_confidence");
	assert.equal(result.synthesizedChildCount, 1);
	assert.equal(result.missingChildKeyCount, 1);
	assert.equal(result.usedSynthesizedSpec, true);
	assert.equal(result.hasRecoveredPlaceholderSection, true);
	assert.deepEqual(result.reasons, [
		"synthesized_missing_children",
		"missing_child_references",
		"selected_synthesized_spec",
		"recovered_placeholder_sections",
	]);
});

test("assessToolFirstGenuiQuality accepts clean renderable specs", () => {
	const spec = {
		root: "root",
		elements: {
			root: {
				type: "Stack",
				props: {},
				children: ["card-1"],
			},
			"card-1": {
				type: "Card",
				props: {
					title: "Google Drive files",
					description: "Top matching files from successful tool calls.",
				},
				children: [],
			},
		},
	};

	const result = assessToolFirstGenuiQuality({
		analysis: {
			synthesizedChildCount: 0,
			missingChildKeys: [],
			synthesizedSpec: null,
		},
		spec,
	});

	assert.equal(result.quality, "acceptable");
	assert.equal(result.reasons.length, 0);
	assert.equal(result.synthesizedChildCount, 0);
	assert.equal(result.missingChildKeyCount, 0);
	assert.equal(result.usedSynthesizedSpec, false);
	assert.equal(result.hasRecoveredPlaceholderSection, false);
});
