/**
 * System prompt for genui chat mode.
 *
 * Uses the auto-generated catalog prompt from `catalog.prompt({ mode: "chat" })`
 * which includes all component types, Zod-derived props, slot info, and critical
 * defaultRules (integrity check, self-check, visible/on placement).
 *
 * VPK-specific rules and companion examples are layered on top.
 *
 * Regenerate the base prompt with: pnpm run generate:prompt
 */

const generatedPrompt = require("./generated-catalog-prompt.json");

/**
 * VPK-specific rules appended after the catalog-generated rules.
 * These cover domain knowledge the catalog schema cannot express.
 */
const VPK_CUSTOM_RULES = [
	// Map generation
	"When the user asks for maps, locations, pins, routes, or directions, use MapWidget (backed by Leaflet/OSM, no API key). Props: center {lat,lng}, zoom, height, selectedMarkerId, markers [{id,lat,lng,title,description?}]. Do NOT invent component names like \"Map\", \"GoogleMap\", or \"MapboxMap\".",

	// Chart placement
	"Charts (BarChart, LineChart, PieChart, AreaChart, RadarChart) are leaf components — place directly as children of Stack or Grid, NOT inside Card children.",

	// 3D filtering
	"Only use 3D components (Scene3D, Group3D, Box, Sphere, Cylinder, Cone, Torus, Plane, Ring, AmbientLight, PointLight, DirectionalLight, Stars, Label3D) when the user explicitly asks for 3D scenes, models, or visualizations.",

	// Atlassian context
	"You can generate UIs for Atlassian product scenarios: Jira (issues, boards, sprints), Confluence (pages, spaces), Trello (boards, lists, cards), Bitbucket (repos, PRs, pipelines), Loom (video listings). Use Lozenge for statuses (e.g. \"In Progress\", \"Done\"), Tag for labels/categories, Avatar for people, Badge for counts.",

	// Output quality
	"Output exactly one ```spec block per response. Keep the ```spec block machine-parseable: no markdown bullets, no prose, no comments inside the fence.",
];

/**
 * Companion examples showing new components in realistic multi-component specs.
 * Each is added as a rule string containing a complete spec example.
 */
const COMPANION_EXAMPLES = [
	// Jira Issue Card
	`Example — Jira issue card with status and labels:
\`\`\`spec
{"op":"add","path":"/root","value":"main"}
{"op":"add","path":"/elements/main","value":{"type":"Stack","props":{"gap":"md"},"children":["header","issueCard"]}}
{"op":"add","path":"/elements/header","value":{"type":"Heading","props":{"level":"h2","text":"Sprint Board"}}}
{"op":"add","path":"/elements/issueCard","value":{"type":"Card","props":{"title":"AUTH-142: Fix login timeout"},"children":["issueDetails"]}}
{"op":"add","path":"/elements/issueDetails","value":{"type":"Stack","props":{"direction":"horizontal","gap":"sm","align":"center"},"children":["status","priority","tags","assignee"]}}
{"op":"add","path":"/elements/status","value":{"type":"Lozenge","props":{"text":"In Progress","appearance":"inprogress","isBold":true}}}
{"op":"add","path":"/elements/priority","value":{"type":"Badge","props":{"text":"High","variant":"destructive"}}}
{"op":"add","path":"/elements/tags","value":{"type":"TagGroup","props":{},"children":["tagAuth","tagBug"]}}
{"op":"add","path":"/elements/tagAuth","value":{"type":"Tag","props":{"text":"auth","color":"blue"}}}
{"op":"add","path":"/elements/tagBug","value":{"type":"Tag","props":{"text":"bug","color":"red"}}}
{"op":"add","path":"/elements/assignee","value":{"type":"Avatar","props":{"fallback":"JD","size":"sm"}}}
\`\`\``,

	// Settings Page
	`Example — settings page with form controls:
\`\`\`spec
{"op":"add","path":"/root","value":"main"}
{"op":"add","path":"/state","value":{"settings":{"notifications":true,"darkMode":false,"volume":75,"language":"en"}}}
{"op":"add","path":"/elements/main","value":{"type":"Stack","props":{"gap":"lg"},"children":["alert","breadcrumb","heading","form"]}}
{"op":"add","path":"/elements/alert","value":{"type":"Alert","props":{"title":"Settings updated","description":"Your preferences have been saved.","variant":"success"}}}
{"op":"add","path":"/elements/breadcrumb","value":{"type":"Breadcrumb","props":{"items":[{"label":"Home","href":"/"},{"label":"Account"},{"label":"Settings"}]}}}
{"op":"add","path":"/elements/heading","value":{"type":"Heading","props":{"level":"h2","text":"Preferences"}}}
{"op":"add","path":"/elements/form","value":{"type":"Stack","props":{"gap":"md"},"children":["notifToggle","darkToggle","volumeSlider","langSelect","saveBtn"]}}
{"op":"add","path":"/elements/notifToggle","value":{"type":"Switch","props":{"label":"Enable notifications","checked":{"$bindState":"/settings/notifications"}}}}
{"op":"add","path":"/elements/darkToggle","value":{"type":"Checkbox","props":{"label":"Dark mode","checked":{"$bindState":"/settings/darkMode"}}}}
{"op":"add","path":"/elements/volumeSlider","value":{"type":"Slider","props":{"label":"Volume","value":{"$bindState":"/settings/volume"},"min":0,"max":100,"step":5}}}
{"op":"add","path":"/elements/langSelect","value":{"type":"SelectInput","props":{"label":"Language","value":{"$bindState":"/settings/language"},"options":[{"label":"English","value":"en"},{"label":"Spanish","value":"es"},{"label":"French","value":"fr"}]}}}
{"op":"add","path":"/elements/saveBtn","value":{"type":"Button","props":{"label":"Save Changes","variant":"default"}}}
\`\`\``,

	// Project Dashboard
	`Example — project dashboard with tabs, charts, and progress:
\`\`\`spec
{"op":"add","path":"/root","value":"main"}
{"op":"add","path":"/elements/main","value":{"type":"Stack","props":{"gap":"lg"},"children":["heading","metricsRow","tabs"]}}
{"op":"add","path":"/elements/heading","value":{"type":"PageHeader","props":{"title":"Project Dashboard","description":"Q1 2025 performance overview"}}}
{"op":"add","path":"/elements/metricsRow","value":{"type":"Grid","props":{"columns":"3","gap":"md"},"children":["m1","m2","m3"]}}
{"op":"add","path":"/elements/m1","value":{"type":"Metric","props":{"label":"Tasks Completed","value":"142","detail":"+18%","trend":"up"}}}
{"op":"add","path":"/elements/m2","value":{"type":"Metric","props":{"label":"Open Issues","value":"23","detail":"-5%","trend":"up"}}}
{"op":"add","path":"/elements/m3","value":{"type":"Metric","props":{"label":"Sprint Velocity","value":"34 pts","detail":"+2 pts","trend":"up"}}}
{"op":"add","path":"/elements/tabs","value":{"type":"Tabs","props":{"tabs":[{"value":"traffic","label":"Traffic"},{"value":"progress","label":"Progress"}],"defaultValue":"traffic"},"children":["tabTraffic","tabProgress"]}}
{"op":"add","path":"/elements/tabTraffic","value":{"type":"TabContent","props":{"value":"traffic"},"children":["areaChart"]}}
{"op":"add","path":"/elements/areaChart","value":{"type":"AreaChart","props":{"title":"Weekly Traffic","data":[{"week":"W1","visitors":1200},{"week":"W2","visitors":1800},{"week":"W3","visitors":1500},{"week":"W4","visitors":2200}],"xKey":"week","yKey":"visitors","color":"#6366f1"}}}
{"op":"add","path":"/elements/tabProgress","value":{"type":"TabContent","props":{"value":"progress"},"children":["tracker"]}}
{"op":"add","path":"/elements/tracker","value":{"type":"ProgressTracker","props":{"steps":[{"label":"Planning","state":"done"},{"label":"Development","state":"done"},{"label":"Testing","state":"current"},{"label":"Release","state":"todo"}]}}}
\`\`\``,

	// Notification Feed
	`Example — notification feed with mixed message types:
\`\`\`spec
{"op":"add","path":"/root","value":"main"}
{"op":"add","path":"/elements/main","value":{"type":"Stack","props":{"gap":"md"},"children":["heading","section0","sep1","section1","sep2","inline1","empty"]}}
{"op":"add","path":"/elements/heading","value":{"type":"Heading","props":{"level":"h2","text":"Notifications"}}}
{"op":"add","path":"/elements/section0","value":{"type":"SectionMessage","props":{"title":"Deployment complete","description":"v2.4.1 deployed to production successfully.","appearance":"success"}}}
{"op":"add","path":"/elements/sep1","value":{"type":"Separator","props":{}}}
{"op":"add","path":"/elements/section1","value":{"type":"Alert","props":{"title":"Scheduled maintenance","description":"Systems will be unavailable Saturday 2am-4am UTC.","variant":"warning"}}}
{"op":"add","path":"/elements/sep2","value":{"type":"Separator","props":{}}}
{"op":"add","path":"/elements/inline1","value":{"type":"Alert","props":{"title":"PR #387 approved","description":"Ready to merge into main branch.","variant":"success"}}}
{"op":"add","path":"/elements/empty","value":{"type":"EmptyState","props":{"title":"All caught up","description":"No more notifications to show."}}}
\`\`\``,
];

function getGenuiSystemPrompt(options = {}) {
	const {
		strict = false,
		webContext = "",
	} = options;

	// Start with the catalog-generated base prompt (includes all components,
	// Zod schemas, defaultRules, SpecStream format, and examples)
	const sections = [generatedPrompt.prompt];

	// Append VPK-specific rules
	const lastRuleNumber = (generatedPrompt.prompt.match(/^(\d+)\./gm) || []).length;
	let ruleNum = lastRuleNumber;

	sections.push("");
	sections.push("ADDITIONAL RULES:");
	for (const rule of VPK_CUSTOM_RULES) {
		ruleNum += 1;
		sections.push(`${ruleNum}. ${rule}`);
	}

	// Append companion examples
	sections.push("");
	sections.push("COMPANION EXAMPLES (use these as reference for multi-component specs):");
	for (const example of COMPANION_EXAMPLES) {
		sections.push("");
		sections.push(example);
	}

	// Strict output section for retries
	if (strict) {
		sections.push("");
		sections.push("STRICT OUTPUT REQUIREMENTS:");
		sections.push("- For UI-generation requests, you MUST output exactly one ```spec block with valid JSON patch lines.");
		sections.push("- Keep the ```spec block machine-parseable: no markdown bullets, no prose, no comments inside the fence.");
		sections.push("- The first patch line must set \"/root\", and that key must exist in \"/elements/<key>\".");
		sections.push("- Include at least one \"/elements/<key>\" patch so the UI can render.");
		sections.push("- If you cannot satisfy the request, output concise text and no ```spec block.");
	}

	// Web context section
	if (typeof webContext === "string" && webContext.trim().length > 0) {
		sections.push("");
		sections.push("OPTIONAL WEB CONTEXT:");
		sections.push("Use this external context when helpful. Treat it as assistive hints (it may be incomplete):");
		sections.push(webContext.trim());
	}

	return sections.join("\n");
}

module.exports = { getGenuiSystemPrompt };
