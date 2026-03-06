const test = require("node:test");
const assert = require("node:assert/strict");

const {
	getNormalizedWidgetDataParts,
	selectLatestRenderableWidgetPart,
} = require("./widget-selection.ts");

function createMessage(parts) {
	return { parts };
}

test("getNormalizedWidgetDataParts collects widget data parts with valid types", () => {
	const normalized = getNormalizedWidgetDataParts(
		createMessage([
			{ type: "text", text: "hello" },
			{
				type: "data-widget-data",
				data: {
					type: "plan",
					payload: { tasks: [{ id: "task-1", label: "Task 1" }] },
				},
			},
			{
				type: "data-widget-data",
				data: {
					type: "  ",
					payload: { value: true },
				},
			},
			{
				type: "data-widget-data",
				data: {
					type: "genui-preview",
					payload: { spec: { root: "main", elements: {} } },
				},
			},
		]),
	);

	assert.equal(normalized.length, 2);
	assert.equal(normalized[0].widgetType, "plan");
	assert.equal(normalized[1].widgetType, "genui-preview");
});

test("selectLatestRenderableWidgetPart falls back to an earlier widget when the latest is not renderable", () => {
	const normalized = getNormalizedWidgetDataParts(
		createMessage([
			{
				type: "data-widget-data",
				data: {
					type: "plan",
					payload: { tasks: [{ id: "task-1", label: "Task 1" }] },
				},
			},
			{
				type: "data-widget-data",
				data: {
					type: "genui-preview",
					payload: { spec: { root: "main", elements: {} } },
				},
			},
		]),
	);

	const selected = selectLatestRenderableWidgetPart(
		normalized,
		(widgetDataPart) => widgetDataPart.widgetType === "plan",
	);

	assert.ok(selected);
	assert.equal(selected.widgetType, "plan");
});

test("selectLatestRenderableWidgetPart keeps the latest part when no renderable matcher is provided", () => {
	const normalized = getNormalizedWidgetDataParts(
		createMessage([
			{
				type: "data-widget-data",
				data: {
					type: "plan",
					payload: { tasks: [{ id: "task-1", label: "Task 1" }] },
				},
			},
			{
				type: "data-widget-data",
				data: {
					type: "genui-preview",
					payload: { spec: { root: "main", elements: {} } },
				},
			},
		]),
	);

	const selected = selectLatestRenderableWidgetPart(normalized);
	assert.ok(selected);
	assert.equal(selected.widgetType, "genui-preview");
});

test("selectLatestRenderableWidgetPart returns null for empty widget arrays", () => {
	assert.equal(selectLatestRenderableWidgetPart([]), null);
});
