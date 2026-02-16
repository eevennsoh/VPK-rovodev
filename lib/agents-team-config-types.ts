export interface AgentsTeamSkill {
	id: string;
	name: string;
	description: string;
	content: string;
	isDefault?: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface AgentsTeamAgent {
	id: string;
	name: string;
	description: string;
	systemPrompt: string;
	model: string;
	allowedTools: string[];
	equippedSkills: string[];
	maxTurns?: number;
	isDefault?: boolean;
	createdAt: string;
	updatedAt: string;
}

export type AgentsTeamSkillInput = Pick<AgentsTeamSkill, "name" | "description" | "content">;
export type AgentsTeamAgentInput = Pick<
	AgentsTeamAgent,
	"name" | "description" | "systemPrompt" | "model" | "allowedTools" | "equippedSkills" | "maxTurns"
>;
