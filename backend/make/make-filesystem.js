/**
 * Filesystem-backed manager for agent team skills and subagents.
 * Reads/writes directly to .rovodev/skills/ and .rovodev/subagents/.
 * No in-memory state — re-reads from disk on every request.
 */

const fs = require("fs");
const path = require("path");

// Resolve .rovodev paths — .rovodev/ is at the project root (parent of backend/)
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const ROVODEV_DIR = path.join(PROJECT_ROOT, ".rovodev");
const SKILLS_DIR = path.join(ROVODEV_DIR, "skills");

// Validation constants from agentskills.io spec
const SKILL_NAME_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const SKILL_NAME_MAX = 64;
const NO_CONSECUTIVE_HYPHENS = /--/;
const SKILL_DESCRIPTION_MAX = 1024;
const SKILL_CONTENT_MAX = 50000;

// --- Path safety ---

/**
 * Validate that a name is safe for use as a filesystem path component.
 * Prevents directory traversal attacks.
 */
function validatePathComponent(name) {
	if (typeof name !== "string" || !name.trim()) return false;
	// No path separators, dots-only names, or hidden files
	if (name.includes("/") || name.includes("\\") || name.includes("\0")) return false;
	if (name === "." || name === "..") return false;
	if (name.startsWith(".")) return false;
	return true;
}

// --- YAML frontmatter parsing ---

/**
 * Parse YAML frontmatter from a markdown file.
 * Format: --- (newline) key: value (newline) --- (newline) body
 *
 * Handles:
 * - Simple key: value pairs
 * - Multi-line values with indented continuation lines (YAML folded/block style)
 * - YAML arrays (both inline JSON-style and block-style with - items)
 * - Nested key.subkey patterns (stored flat as "key.subkey")
 */
function parseFrontmatter(content) {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) return { frontmatter: {}, body: content };

	const frontmatterStr = match[1];
	const body = match[2];
	const frontmatter = {};

	let currentKey = null;
	let currentValue = "";
	let inMultilineValue = false;

	const flushCurrent = () => {
		if (!currentKey) return;
		// Don't overwrite if array items were already stored for this key
		if (!Array.isArray(frontmatter[currentKey])) {
			frontmatter[currentKey] = parseYamlValue(currentValue.trim());
		}
		currentKey = null;
		currentValue = "";
		inMultilineValue = false;
	};

	const lines = frontmatterStr.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();

		if (!trimmed) {
			if (inMultilineValue) {
				currentValue += "\n";
			}
			continue;
		}

		// Check if this is an indented continuation line (starts with spaces/tabs)
		const isIndented = line.match(/^[ \t]+/) && !line.match(/^[ \t]+- /);
		const isArrayItem = line.match(/^[ \t]+- /);

		if (isIndented && currentKey && !isArrayItem) {
			// Continuation of multi-line value
			if (inMultilineValue) {
				currentValue += (currentValue ? "\n" : "") + trimmed;
			} else {
				// Implicit multi-line (indented continuation without | or >)
				currentValue += " " + trimmed;
			}
			continue;
		}

		// Flush previous key-value pair if we have one
		if (currentKey && !isArrayItem) {
			flushCurrent();
		}

		// Array item (block-style)
		if (isArrayItem && currentKey) {
			const itemValue = line.replace(/^[ \t]+- /, "").trim();
			if (!Array.isArray(frontmatter[currentKey])) {
				frontmatter[currentKey] = [];
			}
			frontmatter[currentKey].push(parseYamlValue(itemValue));
			continue;
		}

		// Key-value pair
		const kvMatch = trimmed.match(/^([\w][\w.-]*)\s*:\s*(.*)$/);
		if (kvMatch) {
			currentKey = kvMatch[1];
			const value = kvMatch[2].trim();

			if (value === "|" || value === ">") {
				// Block scalar indicator
				inMultilineValue = true;
				currentValue = "";
			} else if (value === "") {
				// Could be start of array or empty value
				currentValue = "";
			} else {
				currentValue = value;
				inMultilineValue = false;
			}
		}
	}

	// Flush last key-value pair
	flushCurrent();

	return { frontmatter, body };
}

/**
 * Parse a YAML value string into a JS value.
 * Handles JSON arrays, quoted strings, booleans, numbers, and plain strings.
 */
function parseYamlValue(str) {
	if (str === "") return "";
	if (str === "true") return true;
	if (str === "false") return false;
	if (str === "null" || str === "~") return null;

	// JSON array (e.g., ["Read", "Grep"] or with trailing commas)
	if (str.startsWith("[") && str.endsWith("]")) {
		try {
			return JSON.parse(str);
		} catch {
			// Try removing trailing commas before ] (YAML/JSON5 style)
			try {
				const cleaned = str.replace(/,\s*]/g, "]");
				return JSON.parse(cleaned);
			} catch {
				// Fall through to plain string
			}
		}
	}

	// Quoted string
	if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
		return str.slice(1, -1);
	}

	// Number
	if (/^-?\d+(\.\d+)?$/.test(str)) {
		const num = Number(str);
		if (!isNaN(num)) return num;
	}

	return str;
}

/**
 * Generate YAML frontmatter string from an object.
 */
function generateFrontmatter(data) {
	let yaml = "---\n";
	for (const [key, value] of Object.entries(data)) {
		if (value === undefined || value === null) continue;
		if (Array.isArray(value)) {
			if (value.length === 0) continue;
			yaml += `${key}:\n`;
			for (const item of value) {
				yaml += `  - ${item}\n`;
			}
		} else if (typeof value === "string" && value.includes("\n")) {
			// Multi-line string — use YAML block scalar
			yaml += `${key}: |\n`;
			for (const line of value.split("\n")) {
				yaml += `  ${line}\n`;
			}
		} else {
			yaml += `${key}: ${value}\n`;
		}
	}
	yaml += "---\n";
	return yaml;
}

// --- Validation ---

function validateSkillName(name) {
	if (!name) return "Name is required";
	if (name.length > SKILL_NAME_MAX) return "Name must be 64 characters or less";
	if (NO_CONSECUTIVE_HYPHENS.test(name)) return "Name cannot contain consecutive hyphens";
	if (!SKILL_NAME_REGEX.test(name)) return "Name must be lowercase letters, numbers, and hyphens only";
	return null;
}

function validateSkillDescription(desc) {
	if (!desc) return "Description is required";
	if (desc.length > SKILL_DESCRIPTION_MAX) return "Description must be 1024 characters or less";
	return null;
}

function validateAgentName(name) {
	if (!name) return "Name is required";
	if (name.length > SKILL_NAME_MAX) return "Name must be 64 characters or less";
	// Agent names follow similar rules: lowercase + hyphens
	if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name)) {
		return "Name must be lowercase letters, numbers, and hyphens only";
	}
	return null;
}

// --- Built-in detection ---

function isBuiltInSkill(name) {
	return name.startsWith("vpk-");
}

function isBuiltInAgent(name) {
	return name.startsWith("vpk-");
}

// --- Skill operations ---

/**
 * List all skills from disk.
 * Reads .rovodev/skills/ directory, parsing each SKILL.md.
 */
function listSkills() {
	if (!fs.existsSync(SKILLS_DIR)) return [];

	const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
	const skills = [];

	for (const entry of entries) {
		if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
		if (entry.name.startsWith(".")) continue;

		const skillDir = path.join(SKILLS_DIR, entry.name);
		// If it's a symlink, resolve to check if target is a directory
		let isDir = false;
		try {
			const stat = fs.statSync(skillDir);
			isDir = stat.isDirectory();
		} catch {
			continue;
		}
		if (!isDir) continue;

		const skillMdPath = path.join(skillDir, "SKILL.md");
		if (!fs.existsSync(skillMdPath)) continue;

		try {
			const content = fs.readFileSync(skillMdPath, "utf8");
			const { frontmatter, body } = parseFrontmatter(content);

			skills.push({
				name: frontmatter.name || entry.name,
				description: typeof frontmatter.description === "string" ? frontmatter.description : "",
				content: body.trim(),
				license: frontmatter.license,
				compatibility: frontmatter.compatibility,
				allowedTools: frontmatter["allowed-tools"],
				isBuiltIn: isBuiltInSkill(entry.name),
				filePath: skillMdPath,
			});
		} catch (err) {
			console.error(`[AGENTS-FS] Failed to parse skill ${entry.name}:`, err.message);
		}
	}

	return skills.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get a single skill by name.
 */
function getSkillByName(name) {
	if (!name || !validatePathComponent(name)) return null;
	const skillMdPath = path.join(SKILLS_DIR, name, "SKILL.md");
	if (!fs.existsSync(skillMdPath)) return null;

	try {
		const content = fs.readFileSync(skillMdPath, "utf8");
		const { frontmatter, body } = parseFrontmatter(content);
		return {
			name: frontmatter.name || name,
			description: typeof frontmatter.description === "string" ? frontmatter.description : "",
			content: body.trim(),
			license: frontmatter.license,
			compatibility: frontmatter.compatibility,
			allowedTools: frontmatter["allowed-tools"],
			isBuiltIn: isBuiltInSkill(name),
			filePath: skillMdPath,
		};
	} catch {
		return null;
	}
}

/**
 * Write a skill to disk as SKILL.md.
 * Creates the skill directory if it doesn't exist.
 * Uses atomic write (temp file + rename).
 */
function writeSkill(name, description, content, extraFields = {}) {
	const skillDir = path.join(SKILLS_DIR, name);
	const skillMdPath = path.join(skillDir, "SKILL.md");

	if (!fs.existsSync(skillDir)) {
		fs.mkdirSync(skillDir, { recursive: true });
	}

	const frontmatterData = { name, description, ...extraFields };
	const fileContent = generateFrontmatter(frontmatterData) + "\n" + content;

	// Atomic write: write to temp file, then rename
	const tmpPath = skillMdPath + ".tmp";
	fs.writeFileSync(tmpPath, fileContent, "utf8");
	fs.renameSync(tmpPath, skillMdPath);

	return {
		name,
		description,
		content: content.trim(),
		isBuiltIn: isBuiltInSkill(name),
		filePath: skillMdPath,
		...extraFields,
	};
}

/**
 * Delete a skill directory from disk.
 */
function deleteSkill(name) {
	const skillDir = path.join(SKILLS_DIR, name);
	if (!fs.existsSync(skillDir)) {
		throw new Error(`Skill not found: ${name}`);
	}
	fs.rmSync(skillDir, { recursive: true });
}

/**
 * Read raw SKILL.md content for export.
 */
function readSkillRaw(name) {
	const skillMdPath = path.join(SKILLS_DIR, name, "SKILL.md");
	if (!fs.existsSync(skillMdPath)) return null;
	return fs.readFileSync(skillMdPath, "utf8");
}

// --- Agent/subagent operations ---

/**
 * Get the resolved subagents directory path.
 * Checks for subagents/ first, falls back to agents/.
 */
function getSubagentsDir() {
	const subagentsPath = path.join(ROVODEV_DIR, "subagents");
	if (fs.existsSync(subagentsPath)) return subagentsPath;
	const agentsPath = path.join(ROVODEV_DIR, "agents");
	if (fs.existsSync(agentsPath)) return agentsPath;
	// Default to subagents/ for new installs
	return subagentsPath;
}

/**
 * List all agents from disk.
 * Reads .rovodev/subagents/ (or .rovodev/agents/) directory.
 */
function listAgents() {
	const agentsDir = getSubagentsDir();
	if (!fs.existsSync(agentsDir)) return [];

	const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
	const agents = [];

	for (const entry of entries) {
		if (!entry.name.endsWith(".md")) continue;
		if (entry.name.startsWith(".")) continue;

		const agentPath = path.join(agentsDir, entry.name);

		try {
			const content = fs.readFileSync(agentPath, "utf8");
			const { frontmatter, body } = parseFrontmatter(content);
			const agentName = entry.name.replace(/\.md$/, "");

			// Parse tools — could be JSON array, comma-separated string, or block array
			let tools = [];
			if (frontmatter.tools) {
				if (Array.isArray(frontmatter.tools)) {
					tools = frontmatter.tools.map((t) => String(t).trim()).filter(Boolean);
				} else if (typeof frontmatter.tools === "string") {
					tools = frontmatter.tools.split(",").map((t) => t.trim()).filter(Boolean);
				}
			}

			let disallowedTools = [];
			if (frontmatter.disallowedTools) {
				if (Array.isArray(frontmatter.disallowedTools)) {
					disallowedTools = frontmatter.disallowedTools.map((t) => String(t).trim()).filter(Boolean);
				} else if (typeof frontmatter.disallowedTools === "string") {
					disallowedTools = frontmatter.disallowedTools.split(",").map((t) => t.trim()).filter(Boolean);
				}
			}

			// Parse skills — could be array or comma-separated string
			let skills = [];
			if (frontmatter.skills) {
				if (Array.isArray(frontmatter.skills)) {
					skills = frontmatter.skills.map((s) => String(s).trim()).filter(Boolean);
				} else if (typeof frontmatter.skills === "string") {
					skills = frontmatter.skills.split(",").map((s) => s.trim()).filter(Boolean);
				}
			}

			agents.push({
				name: frontmatter.name || agentName,
				description: typeof frontmatter.description === "string" ? frontmatter.description : "",
				systemPrompt: body.trim(),
				model: frontmatter.model || "inherit",
				tools,
				disallowedTools,
				skills,
				maxTurns: frontmatter.maxTurns ? parseInt(String(frontmatter.maxTurns), 10) : undefined,
				permissionMode: frontmatter.permissionMode,
				isBuiltIn: isBuiltInAgent(agentName),
				filePath: agentPath,
			});
		} catch (err) {
			console.error(`[AGENTS-FS] Failed to parse agent ${entry.name}:`, err.message);
		}
	}

	return agents.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get a single agent by name.
 */
function getAgentByName(name) {
	if (!name) return null;
	const agents = listAgents();
	return agents.find((a) => a.name.toLowerCase() === name.toLowerCase()) || null;
}

/**
 * Write an agent to disk as .md.
 * Uses atomic write (temp file + rename).
 */
function writeAgent(name, data) {
	const agentsDir = getSubagentsDir();
	if (!fs.existsSync(agentsDir)) {
		fs.mkdirSync(agentsDir, { recursive: true });
	}

	const agentPath = path.join(agentsDir, `${name}.md`);

	const frontmatterData = {
		name,
		description: data.description,
	};
	if (data.tools && data.tools.length) frontmatterData.tools = data.tools.join(", ");
	if (data.model && data.model !== "inherit") frontmatterData.model = data.model;
	if (data.maxTurns) frontmatterData.maxTurns = data.maxTurns;
	if (data.skills && data.skills.length) frontmatterData.skills = data.skills;
	if (data.permissionMode && data.permissionMode !== "default") frontmatterData.permissionMode = data.permissionMode;
	if (data.disallowedTools && data.disallowedTools.length) frontmatterData.disallowedTools = data.disallowedTools.join(", ");

	const fileContent = generateFrontmatter(frontmatterData) + "\n" + (data.systemPrompt || "");

	// Atomic write
	const tmpPath = agentPath + ".tmp";
	fs.writeFileSync(tmpPath, fileContent, "utf8");
	fs.renameSync(tmpPath, agentPath);

	return {
		name,
		description: data.description || "",
		systemPrompt: (data.systemPrompt || "").trim(),
		model: data.model || "inherit",
		tools: data.tools || [],
		disallowedTools: data.disallowedTools || [],
		skills: data.skills || [],
		maxTurns: data.maxTurns,
		permissionMode: data.permissionMode,
		isBuiltIn: isBuiltInAgent(name),
		filePath: agentPath,
	};
}

/**
 * Delete an agent .md file from disk.
 */
function deleteAgent(name) {
	const agentsDir = getSubagentsDir();
	const agentPath = path.join(agentsDir, `${name}.md`);
	if (!fs.existsSync(agentPath)) {
		throw new Error(`Agent not found: ${name}`);
	}
	fs.unlinkSync(agentPath);
}

/**
 * Read raw agent .md content for export.
 */
function readAgentRaw(name) {
	const agentsDir = getSubagentsDir();
	const agentPath = path.join(agentsDir, `${name}.md`);
	if (!fs.existsSync(agentPath)) return null;
	return fs.readFileSync(agentPath, "utf8");
}

/**
 * Check if a skill directory exists on disk.
 */
function skillExists(name) {
	const skillDir = path.join(SKILLS_DIR, name);
	return fs.existsSync(skillDir) && fs.existsSync(path.join(skillDir, "SKILL.md"));
}

/**
 * Check if an agent .md file exists on disk.
 */
function agentExists(name) {
	const agentsDir = getSubagentsDir();
	return fs.existsSync(path.join(agentsDir, `${name}.md`));
}

// --- Summary functions (replacing configManager methods) ---

/**
 * Get config summary for plan context injection.
 * Replaces configManager.getConfigSummary().
 */
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
			if (a.tools.length > 0) {
				parts.push(`**Allowed Tools:** ${a.tools.join(", ")}`);
			}
			if (a.skills.length > 0) {
				parts.push(`**Equipped Skills:** ${a.skills.join(", ")}`);
			}
			return parts.join("\n");
		});
		sections.push(`## Available Custom Agents\n\n${agentLines.join("\n\n")}`);
	}

	return sections.join("\n\n");
}

/**
 * Build plan mode context (agent list for plan orchestration).
 * Replaces configManager.buildPlanModeContext().
 */
function buildPlanModeContext() {
	const agents = listAgents();
	const sections = [];

	if (agents.length > 0) {
		const agentLines = agents.map((a) => `- **${a.name}**: ${a.description}`);
		sections.push(
			`## Available Agents\n\nAssign tasks to these agents in your plan:\n\n${agentLines.join("\n")}`
		);
	}

	return sections.length > 0 ? sections.join("\n\n") : null;
}

/**
 * Resolve skill contents by skill names (not IDs).
 * Replaces configManager.resolveSkillContents() for the run manager.
 * The run manager calls this with skill names from the agent's `skills` frontmatter.
 */
function resolveSkillContents(skillNames) {
	if (!Array.isArray(skillNames) || skillNames.length === 0) {
		return [];
	}
	return skillNames
		.map((name) => {
			const skill = getSkillByName(name);
			if (!skill) return null;
			return { name: skill.name, content: skill.content };
		})
		.filter(Boolean);
}

/**
 * Create a configManager-compatible interface for the run manager.
 * This bridges the filesystem-backed storage with the run manager's expectations.
 *
 * The run manager expects:
 * - listAgents() returning agents with `equippedSkills` field (array)
 * - resolveSkillContents(skillNames) returning [{name, content}]
 */
function createConfigManagerCompat() {
	return {
		listSkills,
		listAgents: () => {
			// Return agents with equippedSkills alias for backward compat with run manager
			return listAgents().map((agent) => ({
				...agent,
				equippedSkills: agent.skills, // run manager checks agent.equippedSkills
				allowedTools: agent.tools, // run manager may check agent.allowedTools
			}));
		},
		getSkillByName,
		getAgentByName,
		getConfigSummary,
		buildPlanModeContext,
		resolveSkillContents,
	};
}

module.exports = {
	// Skill operations
	listSkills,
	getSkillByName,
	writeSkill,
	deleteSkill,
	readSkillRaw,
	skillExists,

	// Agent operations
	listAgents,
	getAgentByName,
	writeAgent,
	deleteAgent,
	readAgentRaw,
	agentExists,

	// Summary functions
	getConfigSummary,
	buildPlanModeContext,
	resolveSkillContents,

	// Compatibility
	createConfigManagerCompat,

	// Validation
	validateSkillName,
	validateSkillDescription,
	validateAgentName,
	validatePathComponent,

	// Parsing utilities (exported for testing)
	parseFrontmatter,
	generateFrontmatter,

	// Constants
	SKILLS_DIR,
	ROVODEV_DIR,
	SKILL_CONTENT_MAX,
};
