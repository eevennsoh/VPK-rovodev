const test = require("node:test");
const assert = require("node:assert/strict");
const {
	createSidebarSearchMatcher,
	filterItemsBySidebarSearch,
} = require("./sidebar-search.ts");

test("matches case-insensitive regex patterns", () => {
	const matcher = createSidebarSearchMatcher("^get");
	assert.equal(matcher("Get Skill Tool Clarification"), true);
	assert.equal(matcher("Plan rollout"), false);
});

test("falls back to literal substring matching for invalid regex", () => {
	const matcher = createSidebarSearchMatcher("clarif[");
	assert.equal(matcher("Get Skill Tool Clarification"), false);
	assert.equal(matcher("Need clarif[ fallback"), true);
});

test("returns all items when query is empty", () => {
	const items = [{ title: "Alpha" }, { title: "Beta" }];
	const filtered = filterItemsBySidebarSearch(items, "   ", (item) => item.title);
	assert.deepEqual(filtered, items);
});

test("filters items by selected text field", () => {
	const items = [
		{ id: "run-1", title: "Get Skill Tool Clarification" },
		{ id: "run-2", title: "Create release checklist" },
		{ id: "run-3", title: "Plan migration" },
	];

	const filtered = filterItemsBySidebarSearch(items, "plan|check", (item) => item.title);
	assert.deepEqual(
		filtered.map((item) => item.id),
		["run-2", "run-3"]
	);
});
