export interface ChartEntry {
	name: string;
	slug: string;
	category: ChartCategory;
	importPath: string;
	fullWidth: boolean;
}

export type ChartCategory = "area" | "bar" | "line" | "pie" | "radar" | "radial" | "tooltip";

export const CHART_CATEGORIES: { key: ChartCategory; label: string }[] = [
	{ key: "area", label: "Area" },
	{ key: "bar", label: "Bar" },
	{ key: "line", label: "Line" },
	{ key: "pie", label: "Pie" },
	{ key: "radar", label: "Radar" },
	{ key: "radial", label: "Radial" },
	{ key: "tooltip", label: "Tooltip" },
];

function toTitleCase(slug: string): string {
	return slug
		.replace(/^chart-/, "")
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

function chart(slug: string, category: ChartCategory, options?: { fullWidth?: boolean; fileName?: string; name?: string }): ChartEntry {
	const fileName = options?.fileName ?? slug;
	return {
		name: options?.name ?? toTitleCase(slug),
		slug,
		category,
		importPath: `@/components/charts/${category}/${fileName}`,
		fullWidth: options?.fullWidth ?? false,
	};
}

// Area charts
const AREA_CHARTS: ChartEntry[] = [
	chart("chart-area", "area"),
	chart("chart-area-interactive", "area", { fullWidth: true }),
	chart("chart-area-axes", "area"),
	chart("chart-area-gradient", "area"),
	chart("chart-area-icons", "area"),
	chart("chart-area-legend", "area"),
	chart("chart-area-linear", "area"),
	chart("chart-area-stacked", "area"),
	chart("chart-area-stacked-expanded", "area"),
	chart("chart-area-step", "area"),
];

// Bar charts
const BAR_CHARTS: ChartEntry[] = [
	chart("chart-bar", "bar"),
	chart("chart-bar-interactive", "bar", { fullWidth: true }),
	chart("chart-bar-active", "bar"),
	chart("chart-bar-chart-stacked-legend", "bar"),
	chart("chart-bar-custom-label", "bar"),
	chart("chart-bar-horizontal", "bar"),
	chart("chart-bar-label", "bar"),
	chart("chart-bar-mixed", "bar"),
	chart("chart-bar-multiple", "bar"),
	chart("chart-bar-negative", "bar"),
];

// Line charts
const LINE_CHARTS: ChartEntry[] = [
	chart("chart-line", "line"),
	chart("chart-line-interactive", "line", { fullWidth: true }),
	chart("chart-line-custom-dots", "line"),
	chart("chart-line-custom-label", "line"),
	chart("chart-line-dots", "line"),
	chart("chart-line-dots-colors", "line"),
	chart("chart-line-label", "line"),
	chart("chart-line-linear", "line", { fileName: "chart-line.linear" }),
	chart("chart-line-multiple", "line"),
	chart("chart-line-step", "line"),
];

// Pie charts
const PIE_CHARTS: ChartEntry[] = [
	chart("chart-pie", "pie"),
	chart("chart-pie-custom-label", "pie"),
	chart("chart-pie-donut", "pie"),
	chart("chart-pie-donut-active", "pie"),
	chart("chart-pie-donut-with-text", "pie"),
	chart("chart-pie-interactive", "pie", { fullWidth: true }),
	chart("chart-pie-label", "pie"),
	chart("chart-pie-label-list", "pie"),
	chart("chart-pie-legend", "pie"),
	chart("chart-pie-separator-none", "pie"),
	chart("chart-pie-stacked", "pie"),
];

// Radar charts
const RADAR_CHARTS: ChartEntry[] = [
	chart("chart-radar", "radar"),
	chart("chart-radar-custom-label", "radar"),
	chart("chart-radar-dots", "radar"),
	chart("chart-radar-grid-circle", "radar"),
	chart("chart-radar-grid-circle-filled", "radar"),
	chart("chart-radar-grid-circle-no-lines", "radar"),
	chart("chart-radar-grid-custom", "radar"),
	chart("chart-radar-grid-filled", "radar"),
	chart("chart-radar-grid-none", "radar"),
	chart("chart-radar-legend", "radar"),
	chart("chart-radar-lines-only", "radar"),
	chart("chart-radar-multiple", "radar"),
];

// Radial charts
const RADIAL_CHARTS: ChartEntry[] = [
	chart("chart-radial", "radial"),
	chart("chart-radial-grid", "radial"),
	chart("chart-radial-label", "radial"),
	chart("chart-radial-shape", "radial"),
	chart("chart-radial-stacked", "radial"),
	chart("chart-radial-text", "radial"),
];

// Tooltip charts
const TOOLTIP_CHARTS: ChartEntry[] = [
	chart("chart-tooltip", "tooltip"),
	chart("chart-tooltip-advanced", "tooltip"),
	chart("chart-tooltip-custom-label", "tooltip"),
	chart("chart-tooltip-formatter", "tooltip"),
	chart("chart-tooltip-icons", "tooltip"),
	chart("chart-tooltip-label-formatter", "tooltip"),
	chart("chart-tooltip-line-indicator", "tooltip"),
	chart("chart-tooltip-no-indicator", "tooltip"),
	chart("chart-tooltip-no-label", "tooltip"),
];

export const ALL_CHARTS: ChartEntry[] = [
	...AREA_CHARTS,
	...BAR_CHARTS,
	...LINE_CHARTS,
	...PIE_CHARTS,
	...RADAR_CHARTS,
	...RADIAL_CHARTS,
	...TOOLTIP_CHARTS,
];

export function getChartsByCategory(category: ChartCategory): ChartEntry[] {
	return ALL_CHARTS.filter((c) => c.category === category);
}

export function findChart(category: string, slug: string): ChartEntry | undefined {
	return ALL_CHARTS.find((c) => c.category === category && c.slug === slug);
}
