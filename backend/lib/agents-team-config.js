/**
 * In-memory manager for agent team skills and custom agents.
 * Follows the same pattern as agents-team-runs.js.
 */

const { DEFAULT_SKILLS, DEFAULT_AGENTS } = require("./agents-team-config-seed");

function createId() {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createTimestamp() {
	return new Date().toISOString();
}

function validateNonEmptyString(value, fieldName) {
	if (typeof value !== "string" || !value.trim()) {
		throw new Error(`${fieldName} is required`);
	}
	return value.trim();
}

function createConfigManager() {
	/** @type {Map<string, object>} */
	const skillsById = new Map();
	/** @type {Map<string, object>} */
	const agentsById = new Map();
	/** @type {Set<string>} */
	const defaultIds = new Set();

	// --- Seed defaults ---

	for (const seed of DEFAULT_SKILLS) {
		const now = createTimestamp();
		const skill = {
			id: createId(),
			name: seed.name,
			description: seed.description,
			content: seed.content,
			isDefault: true,
			createdAt: now,
			updatedAt: now,
		};
		skillsById.set(skill.id, skill);
		defaultIds.add(skill.id);
	}

	// Build name-to-id map for resolving equipped skills on default agents
	const defaultSkillNameToId = new Map();
	for (const skill of skillsById.values()) {
		if (skill.isDefault) {
			defaultSkillNameToId.set(skill.name.toLowerCase(), skill.id);
		}
	}

	for (const seed of DEFAULT_AGENTS) {
		const now = createTimestamp();
		const equippedSkills = Array.isArray(seed.equippedSkillsByName)
			? seed.equippedSkillsByName
					.map((name) => defaultSkillNameToId.get(name.toLowerCase()))
					.filter(Boolean)
			: [];
		const agent = {
			id: createId(),
			name: seed.name,
			description: seed.description,
			systemPrompt: seed.systemPrompt || "",
			model: seed.model || "sonnet",
			allowedTools: seed.allowedTools || [],
			equippedSkills,
			maxTurns: seed.maxTurns,
			isDefault: true,
			createdAt: now,
			updatedAt: now,
		};
		agentsById.set(agent.id, agent);
		defaultIds.add(agent.id);
	}

	// --- Skills ---

	function createSkill({ name, description, content }) {
		const resolvedName = validateNonEmptyString(name, "name");
		const resolvedDescription = validateNonEmptyString(description, "description");
		const resolvedContent = typeof content === "string" ? content.trim() : "";

		const now = createTimestamp();
		const skill = {
			id: createId(),
			name: resolvedName,
			description: resolvedDescription,
			content: resolvedContent,
			createdAt: now,
			updatedAt: now,
		};

		skillsById.set(skill.id, skill);
		return skill;
	}

	function getSkill(id) {
		return skillsById.get(id) || null;
	}

	function listSkills() {
		return Array.from(skillsById.values());
	}

	function updateSkill(id, data) {
		const existing = skillsById.get(id);
		if (!existing) {
			throw new Error(`Skill not found: ${id}`);
		}

		const updated = { ...existing };
		if (data.name !== undefined) {
			updated.name = validateNonEmptyString(data.name, "name");
		}
		if (data.description !== undefined) {
			updated.description = validateNonEmptyString(data.description, "description");
		}
		if (data.content !== undefined) {
			updated.content = typeof data.content === "string" ? data.content.trim() : "";
		}
		updated.updatedAt = createTimestamp();

		skillsById.set(id, updated);
		return updated;
	}

	function deleteSkill(id) {
		if (!skillsById.has(id)) {
			throw new Error(`Skill not found: ${id}`);
		}
		if (defaultIds.has(id)) {
			throw new Error("Cannot delete default skill");
		}
		skillsById.delete(id);

		// Clean up equipped skill references from all agents
		for (const agent of agentsById.values()) {
			if (Array.isArray(agent.equippedSkills) && agent.equippedSkills.includes(id)) {
				agent.equippedSkills = agent.equippedSkills.filter((skillId) => skillId !== id);
				agent.updatedAt = createTimestamp();
			}
		}
	}

	// --- Agents ---

	function createAgent({ name, description, systemPrompt, model, allowedTools, equippedSkills, maxTurns }) {
		const resolvedName = validateNonEmptyString(name, "name");
		const resolvedDescription = validateNonEmptyString(description, "description");
		const resolvedSystemPrompt = typeof systemPrompt === "string" ? systemPrompt.trim() : "";
		const resolvedModel = typeof model === "string" && model.trim() ? model.trim() : "sonnet";
		const resolvedAllowedTools = Array.isArray(allowedTools)
			? allowedTools.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim())
			: [];
		const resolvedEquippedSkills = Array.isArray(equippedSkills)
			? equippedSkills.filter((id) => typeof id === "string" && id.trim() && skillsById.has(id.trim())).map((id) => id.trim())
			: [];
		const resolvedMaxTurns =
			typeof maxTurns === "number" && Number.isInteger(maxTurns) && maxTurns > 0
				? maxTurns
				: undefined;

		const now = createTimestamp();
		const agent = {
			id: createId(),
			name: resolvedName,
			description: resolvedDescription,
			systemPrompt: resolvedSystemPrompt,
			model: resolvedModel,
			allowedTools: resolvedAllowedTools,
			equippedSkills: resolvedEquippedSkills,
			maxTurns: resolvedMaxTurns,
			createdAt: now,
			updatedAt: now,
		};

		agentsById.set(agent.id, agent);
		return agent;
	}

	function getAgent(id) {
		return agentsById.get(id) || null;
	}

	function listAgents() {
		return Array.from(agentsById.values());
	}

	function updateAgent(id, data) {
		const existing = agentsById.get(id);
		if (!existing) {
			throw new Error(`Agent not found: ${id}`);
		}

		const updated = { ...existing };
		if (data.name !== undefined) {
			updated.name = validateNonEmptyString(data.name, "name");
		}
		if (data.description !== undefined) {
			updated.description = validateNonEmptyString(data.description, "description");
		}
		if (data.systemPrompt !== undefined) {
			updated.systemPrompt = typeof data.systemPrompt === "string" ? data.systemPrompt.trim() : "";
		}
		if (data.model !== undefined) {
			updated.model = typeof data.model === "string" && data.model.trim() ? data.model.trim() : updated.model;
		}
		if (data.allowedTools !== undefined) {
			updated.allowedTools = Array.isArray(data.allowedTools)
				? data.allowedTools.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim())
				: updated.allowedTools;
		}
		if (data.equippedSkills !== undefined) {
			updated.equippedSkills = Array.isArray(data.equippedSkills)
				? data.equippedSkills.filter((id) => typeof id === "string" && id.trim() && skillsById.has(id.trim())).map((id) => id.trim())
				: updated.equippedSkills;
		}
		if (data.maxTurns !== undefined) {
			updated.maxTurns =
				typeof data.maxTurns === "number" && Number.isInteger(data.maxTurns) && data.maxTurns > 0
					? data.maxTurns
					: undefined;
		}
		updated.updatedAt = createTimestamp();

		agentsById.set(id, updated);
		return updated;
	}

	function deleteAgent(id) {
		if (!agentsById.has(id)) {
			throw new Error(`Agent not found: ${id}`);
		}
		if (defaultIds.has(id)) {
			throw new Error("Cannot delete default agent");
		}
		agentsById.delete(id);
	}

	// --- Summary for plan context ---

	function getConfigSummary() {
		const skills = listSkills();
		const agents = listAgents();

		if (skills.length === 0 && agents.length === 0) {
			return null;
		}

		const sections = [];

		if (skills.length > 0) {
			const skillLines = skills.map(
				(s) => `### ${s.name}\n${s.description}\n\n${s.content}`
			);
			sections.push(`## Available Skills\n\n${skillLines.join("\n\n")}`);
		}

		if (agents.length > 0) {
			const agentLines = agents.map((a) => {
				const parts = [`### ${a.name}`, a.description];
				if (a.systemPrompt) {
					parts.push(`**System Prompt:** ${a.systemPrompt}`);
				}
				parts.push(`**Model:** ${a.model}`);
				if (a.allowedTools.length > 0) {
					parts.push(`**Allowed Tools:** ${a.allowedTools.join(", ")}`);
				}
				if (Array.isArray(a.equippedSkills) && a.equippedSkills.length > 0) {
					const skillNames = a.equippedSkills
						.map((id) => skillsById.get(id)?.name)
						.filter(Boolean);
					if (skillNames.length > 0) {
						parts.push(`**Equipped Skills:** ${skillNames.join(", ")}`);
					}
				}
				return parts.join("\n");
			});
			sections.push(`## Available Custom Agents\n\n${agentLines.join("\n\n")}`);
		}

		return sections.join("\n\n");
	}

	function resolveSkillContents(skillIds) {
		if (!Array.isArray(skillIds) || skillIds.length === 0) {
			return [];
		}
		return skillIds
			.map((id) => {
				const skill = skillsById.get(id);
				if (!skill) return null;
				return { id: skill.id, name: skill.name, content: skill.content };
			})
			.filter(Boolean);
	}

	function getSkillByName(name) {
		if (typeof name !== "string" || !name.trim()) return null;
		const normalized = name.trim().toLowerCase();
		for (const skill of skillsById.values()) {
			if (skill.name.toLowerCase() === normalized) return skill;
		}
		return null;
	}

	function buildPlanModeContext() {
		const createPlanSkill = getSkillByName("create-plan");
		const agents = listAgents().filter(
			(a) => a.name.toLowerCase() !== "visual presenter"
		);
		const sections = [];

		if (createPlanSkill?.content) {
			sections.push(createPlanSkill.content);
		}

		if (agents.length > 0) {
			const agentLines = agents.map((a) => `- **${a.name}**: ${a.description}`);
			sections.push(
				`## Available Agents\n\nAssign tasks to these agents in your plan:\n\n${agentLines.join("\n")}`
			);
		}

		return sections.length > 0 ? sections.join("\n\n") : null;
	}

	return {
		createSkill,
		getSkill,
		getSkillByName,
		listSkills,
		updateSkill,
		deleteSkill,
		createAgent,
		getAgent,
		listAgents,
		updateAgent,
		deleteAgent,
		getConfigSummary,
		buildPlanModeContext,
		resolveSkillContents,
	};
}

module.exports = { createConfigManager };
