/**
 * Default seed data for agent team skills and agents.
 * These mirror the actual skills and agents that RovoDev has access to
 * from the .rovodev/ directory. They are created on server start and
 * cannot be deleted by users.
 */

const DEFAULT_SKILLS = [
	{
		name: "create-plan",
		description:
			"Create a concise plan. Use when a user explicitly asks for a plan related to a coding task.",
		content: "# Create Plan\n\nTurn a user prompt into a single, actionable plan delivered in the final assistant message.",
	},
	{
		name: "frontend-design",
		description:
			"Create distinctive, production-grade frontend interfaces with high design quality. Use when building web components, pages, or applications that need polished visual design.",
		content: "# Frontend Design\n\nCreate distinctive, production-grade frontend interfaces that avoid generic aesthetics with exceptional attention to aesthetic details and creative choices.",
	},
];

const DEFAULT_AGENTS = [
	{
		name: "Extractor",
		description:
			"Figma design extraction specialist. Extracts design specifications from Figma and maps them to ADS tokens. Part of the Figma-to-code pipeline.",
		systemPrompt:
			"You are a Figma design extraction specialist. Extract design specifications from Figma and map them to ADS tokens.",
		model: "haiku",
		allowedTools: [],
		equippedSkillsByName: [],
	},
	{
		name: "Implementer",
		description:
			"Figma implementation specialist. Takes extracted design specs and implements production-ready VPK components.",
		systemPrompt:
			"You are a Figma implementation specialist. Take extracted design specs and implement production-ready VPK components.",
		model: "sonnet",
		allowedTools: [],
		equippedSkillsByName: [],
	},
	{
		name: "Validator",
		description:
			"Figma visual validation specialist. Compares implemented UI against Figma screenshots to verify accuracy.",
		systemPrompt:
			"You are a Figma visual validation specialist. Compare implemented UI against Figma screenshots.",
		model: "haiku",
		allowedTools: [],
		equippedSkillsByName: [],
	},
	{
		name: "Tidy",
		description:
			"React component refactoring and code simplification specialist. Tidies up components, extracts sub-components, and improves code organization and reusability.",
		systemPrompt:
			"You are a React component refactoring specialist. Tidy up components, extract sub-components, modularize code, and improve organization and reusability.",
		model: "sonnet",
		allowedTools: [],
		equippedSkillsByName: ["vpk-tidy"],
	},
];

module.exports = { DEFAULT_SKILLS, DEFAULT_AGENTS };
