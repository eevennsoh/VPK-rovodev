// Validation constants
export const SKILL_NAME_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
export const SKILL_NAME_MAX = 64;
export const SKILL_DESCRIPTION_MAX = 1024;
export const SKILL_CONTENT_RECOMMENDED_MAX = 50_000;
export const SKILLS_PER_AGENT_SOFT_LIMIT = 10;
export const NO_CONSECUTIVE_HYPHENS = /--/;

// Skill — parsed from SKILL.md frontmatter + body
export interface MakeSkill {
	name: string; // agentskills.io slug (also directory name)
	description: string; // agentskills.io: 1-1024 chars
	content: string; // Markdown body after frontmatter
	// Optional agentskills.io fields
	license?: string;
	compatibility?: string;
	metadata?: Record<string, string>;
	allowedTools?: string;
	// Derived
	isBuiltIn: boolean; // true for pre-existing skills (not user-created via UI)
	filePath: string; // absolute path to SKILL.md
}

// Agent — parsed from Claude Code subagent .md frontmatter + body
export interface MakeAgent {
	name: string; // slug identifier
	description: string;
	systemPrompt: string; // markdown body (the system prompt)
	model: string; // "sonnet" | "opus" | "haiku" | "inherit"
	tools: string[]; // allowed tools
	disallowedTools?: string[];
	skills: string[]; // equipped skill names
	maxTurns?: number;
	permissionMode?: string;
	// Derived
	isBuiltIn: boolean; // e.g., vpk-agent-* files
	filePath: string; // absolute path to .md file
}

// Input types for creation
export type MakeSkillInput = Pick<MakeSkill, "name" | "description" | "content">;
export type MakeAgentInput = Pick<
	MakeAgent,
	"name" | "description" | "systemPrompt" | "model" | "tools" | "skills"
> & {
	disallowedTools?: string[];
	maxTurns?: number;
	permissionMode?: string;
};

// Validation helpers
export function validateSkillName(name: string): string | null {
	if (!name) return "Name is required";
	if (name.length > SKILL_NAME_MAX) return "Name must be 64 characters or less";
	if (NO_CONSECUTIVE_HYPHENS.test(name)) return "Name cannot contain consecutive hyphens";
	if (!SKILL_NAME_REGEX.test(name))
		return "Name must be lowercase letters, numbers, and hyphens only";
	return null;
}

export function validateSkillDescription(desc: string): string | null {
	if (!desc) return "Description is required";
	if (desc.length > SKILL_DESCRIPTION_MAX) return "Description must be 1024 characters or less";
	return null;
}

export function generateSlug(displayName: string): string {
	return displayName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-{2,}/g, "-")
		.slice(0, 64);
}
