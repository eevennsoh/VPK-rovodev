const test = require("node:test");
const assert = require("node:assert/strict");

const {
	maybeInjectWorkSummaryChart,
	maybeNormalizeWorkSummaryDateTextSize,
} = require("./genui-chat-handler");

function buildWorkSummarySpec() {
	return {
		root: "main",
		elements: {
			main: {
				type: "Stack",
				props: { gap: "lg" },
				children: ["heading", "metrics", "tabs"],
			},
			heading: {
				type: "Heading",
				props: { level: "h2", text: "Work Summary — Last 7 Days" },
			},
			metrics: {
				type: "Grid",
				props: { columns: "3", gap: "md" },
				children: ["m1", "m2", "m3"],
			},
			m1: {
				type: "Metric",
				props: { label: "Work Items", value: "1", detail: "Updated", trend: "neutral" },
			},
			m2: {
				type: "Metric",
				props: { label: "Pages", value: "3", detail: "Edited", trend: "up" },
			},
			m3: {
				type: "Metric",
				props: { label: "Total Activity", value: "4", detail: "Items", trend: "up" },
			},
			tabs: {
				type: "Tabs",
				props: {
					tabs: [
						{ value: "work-items", label: "Work Items" },
						{ value: "activity", label: "Activity" },
					],
					defaultValue: "work-items",
				},
				children: ["tab-work-items", "tab-activity"],
			},
		},
	};
}

test("maybeInjectWorkSummaryChart injects work items vs pages chart before tabs", () => {
	const spec = buildWorkSummarySpec();
	const result = maybeInjectWorkSummaryChart(spec);

	assert.equal(result.injected, true);
	assert.equal(result.spec, spec);

	const children = spec.elements.main.children;
	assert.deepEqual(children, ["heading", "metrics", "activity-breakdown-chart", "tabs"]);

	const chart = spec.elements["activity-breakdown-chart"];
	assert.equal(chart.type, "BarChart");
	assert.deepEqual(chart.props.data, [
		{ source: "Work Items", count: 1 },
		{ source: "Pages", count: 3 },
	]);
	assert.equal(chart.props.xKey, "source");
	assert.equal(chart.props.yKey, "count");
});

test("maybeInjectWorkSummaryChart does not inject when chart already exists", () => {
	const spec = buildWorkSummarySpec();
	spec.elements["existing-chart"] = {
		type: "BarChart",
		props: {
			title: "Existing",
			data: [{ source: "Work Items", count: 1 }],
			xKey: "source",
			yKey: "count",
		},
	};
	spec.elements.main.children.splice(2, 0, "existing-chart");

	const result = maybeInjectWorkSummaryChart(spec);

	assert.equal(result.injected, false);
	assert.equal(spec.elements["activity-breakdown-chart"], undefined);
	assert.deepEqual(spec.elements.main.children, ["heading", "metrics", "existing-chart", "tabs"]);
});

test("maybeInjectWorkSummaryChart skips injection when summary metrics are incomplete", () => {
	const spec = buildWorkSummarySpec();
	delete spec.elements.m2;
	spec.elements.metrics.children = ["m1", "m3"];

	const result = maybeInjectWorkSummaryChart(spec);

	assert.equal(result.injected, false);
	assert.equal(spec.elements["activity-breakdown-chart"], undefined);
	assert.deepEqual(spec.elements.main.children, ["heading", "metrics", "tabs"]);
});

test("maybeNormalizeWorkSummaryDateTextSize sets Created/Updated row to xs", () => {
	const spec = {
		root: "main",
		elements: {
			main: {
				type: "Stack",
				props: { gap: "md" },
				children: ["date-row", "notes"],
			},
			"date-row": {
				type: "Text",
				props: { content: "Created Feb 21, 2026 · Updated Feb 22, 2026", muted: true },
			},
			notes: {
				type: "Text",
				props: { content: "Request to modify the logo", muted: false, size: "sm" },
			},
		},
	};

	const result = maybeNormalizeWorkSummaryDateTextSize(spec);

	assert.equal(result.normalized, true);
	assert.equal(spec.elements["date-row"].props.size, "xs");
	assert.equal(spec.elements.notes.props.size, "sm");
});

test("maybeNormalizeWorkSummaryDateTextSize is no-op when date row already xs", () => {
	const spec = {
		root: "main",
		elements: {
			main: {
				type: "Stack",
				props: { gap: "md" },
				children: ["date-row"],
			},
			"date-row": {
				type: "Text",
				props: { content: "Created Feb 21, 2026 · Updated Feb 22, 2026", muted: true, size: "xs" },
			},
		},
	};

	const result = maybeNormalizeWorkSummaryDateTextSize(spec);

	assert.equal(result.normalized, false);
	assert.equal(spec.elements["date-row"].props.size, "xs");
});

test("maybeNormalizeWorkSummaryDateTextSize sets Updated-only row to xs", () => {
	const spec = {
		root: "main",
		elements: {
			main: {
				type: "Stack",
				props: { gap: "md" },
				children: ["updated-row", "notes"],
			},
			"updated-row": {
				type: "Text",
				props: { content: "Updated Feb 22, 2026", muted: true },
			},
			notes: {
				type: "Text",
				props: { content: "Updated onboarding copy", muted: false, size: "sm" },
			},
		},
	};

	const result = maybeNormalizeWorkSummaryDateTextSize(spec);

	assert.equal(result.normalized, true);
	assert.equal(spec.elements["updated-row"].props.size, "xs");
	assert.equal(spec.elements.notes.props.size, "sm");
});
