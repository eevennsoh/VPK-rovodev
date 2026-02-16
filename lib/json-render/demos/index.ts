import type { Spec } from "@json-render/react";
import { dashboardSpec } from "./dashboard";
import { dataVizSpec } from "./data-viz";
import { interactiveFormSpec } from "./interactive-form";
import { solarSystemSpec } from "./solar-system";
import { mixedSpec } from "./mixed-2d-3d";
import { jiraBoardSpec } from "./jira-board";
import { teamProfileSpec } from "./team-profile";
import { settingsFormSpec } from "./settings-form";
import { confluencePageSpec } from "./confluence-page";

export interface ExampleSpec {
	id: string;
	name: string;
	description: string;
	spec: Spec;
}

export const EXAMPLE_SPECS: ExampleSpec[] = [
	{
		id: "dashboard",
		name: "Dashboard",
		description: "Analytics dashboard with metrics, bar chart, and data table",
		spec: dashboardSpec,
	},
	{
		id: "data-viz",
		name: "Data Viz",
		description: "Tabbed chart gallery with bar, line, and pie charts",
		spec: dataVizSpec,
	},
	{
		id: "interactive-form",
		name: "Form",
		description: "Interactive form with two-way bindings and conditional visibility",
		spec: interactiveFormSpec,
	},
	{
		id: "solar-system",
		name: "Solar System",
		description: "3D solar system with orbiting planets and starfield",
		spec: solarSystemSpec,
	},
	{
		id: "mixed-2d-3d",
		name: "Mixed 2D + 3D",
		description: "Combined metrics, timeline, accordion, and embedded 3D scene",
		spec: mixedSpec,
	},
	{
		id: "jira-board",
		name: "Jira Board",
		description: "Sprint board with issue cards, lozenges, tags, and avatars",
		spec: jiraBoardSpec,
	},
	{
		id: "team-profile",
		name: "Team Profile",
		description: "Team directory with avatars, roles, and status indicators",
		spec: teamProfileSpec,
	},
	{
		id: "settings-form",
		name: "Settings",
		description: "Settings page with switches, checkboxes, slider, and select",
		spec: settingsFormSpec,
	},
	{
		id: "confluence-page",
		name: "Confluence Page",
		description: "Documentation page with code block, table, accordion, and comments",
		spec: confluencePageSpec,
	},
];
