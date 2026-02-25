export interface PlanSkill {
	id: string;
	name: string;
	description: string;
	content: string;
	isDefault?: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface PlanAgent {
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

export type PlanSkillInput = Pick<PlanSkill, "name" | "description" | "content">;
export type PlanAgentInput = Pick<
	PlanAgent,
	"name" | "description" | "systemPrompt" | "model" | "allowedTools" | "equippedSkills" | "maxTurns"
>;
