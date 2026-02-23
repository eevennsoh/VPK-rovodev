const test = require("node:test");
const assert = require("node:assert/strict");

const {
	createBodyOnlySpec,
	parseGenerativeWidget,
	resolveGenerativeWidgetMetadata,
} = require("./generative-widget.ts");

test("createBodyOnlySpec removes empty translated card lead-in section and separator", () => {
	const spec = {
		root: "root",
		elements: {
			root: {
				type: "Stack",
				props: { direction: "vertical", gap: "md" },
				children: ["original-section", "separator", "translated-section"],
			},
			"original-section": {
				type: "Stack",
				props: { direction: "vertical", gap: "sm" },
				children: ["original-heading", "original-text"],
			},
			"original-heading": {
				type: "Heading",
				props: { text: "Original (English)", level: "h4", className: null },
			},
			"original-text": {
				type: "Text",
				props: { content: "I want ice cream please", muted: null },
			},
			separator: {
				type: "Separator",
				props: { orientation: "horizontal" },
			},
			"translated-section": {
				type: "Stack",
				props: { direction: "vertical", gap: "sm" },
				children: ["translated-heading", "translated-text"],
			},
			"translated-heading": {
				type: "Heading",
				props: {
					text: "Translated (Chinese (Simplified))",
					level: "h4",
					className: "text-sm font-semibold",
				},
			},
			"translated-text": {
				type: "Heading",
				props: { text: "我想吃冰淇淋", level: "h4", className: "text-lg font-medium" },
			},
		},
	};

	const widget = {
		type: "genui-preview",
		spec,
		source: null,
	};

	const result = createBodyOnlySpec(widget);

	assert.deepEqual(result.elements.root.children, ["translated-section"]);
	assert.equal(result.elements["original-section"], undefined);
	assert.equal(result.elements["original-heading"], undefined);
	assert.equal(result.elements["original-text"], undefined);
	assert.equal(result.elements.separator, undefined);
	assert.equal(result.elements["translated-section"].type, "Stack");
});

test("createBodyOnlySpec normalizes translation heading and body typography", () => {
	const spec = {
		root: "root",
		elements: {
			root: {
				type: "Stack",
				props: { direction: "vertical", gap: "md" },
				children: ["original-section", "separator", "translated-section"],
			},
			"original-section": {
				type: "Stack",
				props: { direction: "vertical", gap: "sm" },
				children: ["original-heading", "original-text"],
			},
			"original-heading": {
				type: "Heading",
				props: { text: "Original (English)", level: "h4", className: null },
			},
			"original-text": {
				type: "Text",
				props: { content: "I want ice cream", muted: null },
			},
			separator: {
				type: "Separator",
				props: { orientation: "horizontal" },
			},
			"translated-section": {
				type: "Stack",
				props: { direction: "vertical", gap: "sm" },
				children: ["translated-heading", "translated-text"],
			},
			"translated-heading": {
				type: "Heading",
				props: {
					text: "Translated (Chinese (Simplified))",
					level: "h4",
					className: null,
				},
			},
			"translated-text": {
				type: "Text",
				props: { content: "我想吃冰淇淋", muted: true, size: "sm" },
			},
		},
	};

	const widget = {
		type: "genui-preview",
		spec,
		source: null,
	};

	const result = createBodyOnlySpec(widget);

	assert.equal(result.elements["translated-heading"].props.level, "h4");
	assert.equal(
		result.elements["translated-heading"].props.className,
		"text-sm font-semibold"
	);
	assert.equal(result.elements["translated-text"].type, "Heading");
	assert.equal(result.elements["translated-text"].props.level, "h4");
	assert.equal(
		result.elements["translated-text"].props.className,
		"text-lg font-medium"
	);
	assert.equal(result.elements["translated-text"].props.text, "我想吃冰淇淋");
});

test("createBodyOnlySpec keeps meaningful separators between remaining sections", () => {
	const spec = {
		root: "root",
		elements: {
			root: {
				type: "Stack",
				props: { direction: "vertical", gap: "md" },
				children: [
					"context-section",
					"separator-main",
					"target-section",
					"separator-tail",
					"content-section",
				],
			},
			"context-section": {
				type: "Stack",
				props: { direction: "vertical", gap: "sm" },
				children: ["context-heading", "context-text"],
			},
			"context-heading": {
				type: "Heading",
				props: { text: "Original content", level: "h4", className: null },
			},
			"context-text": {
				type: "Text",
				props: {
					content: "This description is intentionally long enough.",
					muted: null,
				},
			},
			"separator-main": {
				type: "Separator",
				props: { orientation: "horizontal" },
			},
			"target-section": {
				type: "Stack",
				props: { direction: "vertical", gap: "sm" },
				children: ["target-heading", "target-text"],
			},
			"target-heading": {
				type: "Heading",
				props: { text: "Target section", level: "h4", className: null },
			},
			"target-text": {
				type: "Text",
				props: { content: "Target body text", muted: null },
			},
			"separator-tail": {
				type: "Separator",
				props: { orientation: "horizontal" },
			},
			"content-section": {
				type: "Stack",
				props: { direction: "vertical", gap: "sm" },
				children: ["content-heading", "content-text"],
			},
			"content-heading": {
				type: "Heading",
				props: { text: "Content section", level: "h4", className: null },
			},
			"content-text": {
				type: "Text",
				props: { content: "Body content", muted: null },
			},
		},
	};

	const widget = {
		type: "genui-preview",
		spec,
		source: null,
	};

	const result = createBodyOnlySpec(widget);

	assert.deepEqual(result.elements.root.children, [
		"target-section",
		"separator-tail",
		"content-section",
	]);
	assert.equal(result.elements["separator-main"], undefined);
	assert.equal(result.elements["separator-tail"].type, "Separator");
});

test("createBodyOnlySpec falls back to original spec when root would be removed", () => {
	const spec = {
		root: "header-root",
		elements: {
			"header-root": {
				type: "Heading",
				props: { text: "Only title", level: "h2", className: null },
			},
		},
	};

	const widget = {
		type: "genui-preview",
		spec,
		source: null,
	};

	const result = createBodyOnlySpec(widget);

	assert.equal(result, spec);
});

test("resolveGenerativeWidgetMetadata infers calendar content type from card text", () => {
	const widget = parseGenerativeWidget("genui-preview", {
		spec: {
			root: "root",
			elements: {
				root: {
					type: "Stack",
					props: { direction: "vertical", gap: "md" },
					children: ["summary-card"],
				},
				"summary-card": {
					type: "Card",
					props: {
						title: "Google Calendar Events",
						description: "Next 7 days",
					},
					children: [],
				},
			},
		},
	});

	assert.ok(widget);
	const metadata = resolveGenerativeWidgetMetadata(widget);
	assert.equal(metadata.contentType, "calendar");
});

test("calendar inference overrides generic text contentType hints", () => {
	const widget = parseGenerativeWidget("genui-preview", {
		contentType: "text",
		spec: {
			root: "root",
			elements: {
				root: {
					type: "Stack",
					props: { direction: "vertical", gap: "md" },
					children: ["summary-card"],
				},
				"summary-card": {
					type: "Card",
					props: {
						title: "Google Calendar Events",
						description: "Upcoming meetings",
					},
					children: [],
				},
			},
		},
	});

	assert.ok(widget);
	const metadata = resolveGenerativeWidgetMetadata(widget);
	assert.equal(metadata.contentType, "calendar");
});

test("resolveGenerativeWidgetMetadata infers translation content type from title", () => {
	const widget = parseGenerativeWidget("genui-preview", {
		spec: {
			root: "root",
			elements: {
				root: {
					type: "Stack",
					props: { direction: "vertical", gap: "md" },
					children: ["summary-card"],
				},
				"summary-card": {
					type: "Card",
					props: {
						title: "Translation",
						description: "English to Mandarin Chinese",
					},
					children: [],
				},
			},
		},
	});

	assert.ok(widget);
	const metadata = resolveGenerativeWidgetMetadata(widget);
	assert.equal(metadata.contentType, "translation");
});

test("resolveGenerativeWidgetMetadata infers message content type from Slack title", () => {
	const widget = parseGenerativeWidget("genui-preview", {
		spec: {
			root: "root",
			elements: {
				root: {
					type: "Stack",
					props: { direction: "vertical", gap: "md" },
					children: ["summary-card"],
				},
				"summary-card": {
					type: "Card",
					props: {
						title: "Send Slack Message",
						description: "Fill in the channel and message, then click Send Message.",
					},
					children: [],
				},
			},
		},
	});

	assert.ok(widget);
	const metadata = resolveGenerativeWidgetMetadata(widget);
	assert.equal(metadata.contentType, "message");
});

test("resolveGenerativeWidgetMetadata infers work-item content type from work summary title", () => {
	const widget = parseGenerativeWidget("genui-preview", {
		spec: {
			root: "root",
			elements: {
				root: {
					type: "Stack",
					props: { direction: "vertical", gap: "md" },
					children: ["summary-card"],
				},
				"summary-card": {
					type: "Card",
					props: {
						title: "Work Summary — Last 7 Days",
						description: "Recent Jira issues and Confluence activity.",
					},
					children: [],
				},
			},
		},
	});

	assert.ok(widget);
	const metadata = resolveGenerativeWidgetMetadata(widget);
	assert.equal(metadata.contentType, "work-item");
});

test("explicit widgetContentType hint takes precedence for message cards", () => {
	const widget = parseGenerativeWidget("genui-preview", {
		widgetContentType: "message",
		spec: {
			root: "root",
			elements: {
				root: {
					type: "Stack",
					props: { direction: "vertical", gap: "md" },
					children: ["summary-card"],
				},
				"summary-card": {
					type: "Card",
					props: {
						title: "Generated content",
						description: "Tool results",
					},
					children: [],
				},
			},
		},
	});

	assert.ok(widget);
	const metadata = resolveGenerativeWidgetMetadata(widget);
	assert.equal(metadata.contentType, "message");
});
