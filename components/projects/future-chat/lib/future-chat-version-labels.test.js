const test = require("node:test");
const assert = require("node:assert/strict");

const {
	formatFutureChatVersionLabel,
	getFutureChatVersionTitle,
} = require("./future-chat-version-labels.ts");

test("getFutureChatVersionTitle prefers the selected version title snapshot", () => {
	assert.equal(
		getFutureChatVersionTitle({
			document: { title: "Current title" },
			version: { title: "Historical title" },
		}),
		"Historical title",
	);
});

test("formatFutureChatVersionLabel includes version number and change label", () => {
	const label = formatFutureChatVersionLabel({
		document: {
			versions: [
				{
					id: "version-1",
				},
				{
					id: "version-2",
				},
			],
		},
		referenceDate: new Date("2026-03-09T00:02:00.000Z"),
		version: {
			changeLabel: "Renamed title",
			createdAt: "2026-03-09T00:00:00.000Z",
			id: "version-2",
		},
	});

	assert.match(label, /^Version 2 • Renamed title • /);
});
