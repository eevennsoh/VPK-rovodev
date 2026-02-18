"use client";

import { useCallback, useState } from "react";
import { useCreationModeActions } from "@/app/contexts/context-creation-mode";
import type {
	AgentsTeamSkill,
	AgentsTeamSkillInput,
	AgentsTeamAgent,
	AgentsTeamAgentInput,
} from "@/lib/agents-team-config-types";

interface ConfigDialogsInput {
	skills: AgentsTeamSkill[];
	createSkill: (data: AgentsTeamSkillInput) => Promise<unknown>;
	updateSkill: (id: string, data: Partial<AgentsTeamSkillInput>) => Promise<unknown>;
	deleteSkill: (id: string) => Promise<unknown>;
	createAgent: (data: AgentsTeamAgentInput) => Promise<unknown>;
	updateAgent: (id: string, data: Partial<AgentsTeamAgentInput>) => Promise<unknown>;
	deleteAgent: (id: string) => Promise<unknown>;
}

export interface SkillDialogProps {
	open: boolean;
	skill: AgentsTeamSkill | null;
	onOpenChange: (open: boolean) => void;
	onSave: (data: AgentsTeamSkillInput) => Promise<unknown>;
	onDelete: (id: string) => Promise<unknown>;
}

export interface AgentDialogProps {
	open: boolean;
	agent: AgentsTeamAgent | null;
	availableSkills: AgentsTeamSkill[];
	onOpenChange: (open: boolean) => void;
	onSave: (data: AgentsTeamAgentInput) => Promise<unknown>;
	onDelete: (id: string) => Promise<unknown>;
}

export interface SidebarConfigHandlers {
	onEditSkill: (skill: AgentsTeamSkill) => void;
	onNewSkill: () => void;
	onEditAgent: (agent: AgentsTeamAgent) => void;
	onNewAgent: () => void;
}

export function useConfigDialogs({
	skills,
	createSkill,
	updateSkill,
	deleteSkill,
	createAgent,
	updateAgent,
	deleteAgent,
}: ConfigDialogsInput) {
	const [skillDialogOpen, setSkillDialogOpen] = useState(false);
	const [agentDialogOpen, setAgentDialogOpen] = useState(false);
	const [editingSkill, setEditingSkill] = useState<AgentsTeamSkill | null>(null);
	const [editingAgent, setEditingAgent] = useState<AgentsTeamAgent | null>(null);
	const { setSkillCreationMode, setAgentCreationMode } = useCreationModeActions();

	const handleEditSkill = useCallback((skill: AgentsTeamSkill) => {
		setEditingSkill(skill);
		setSkillDialogOpen(true);
	}, []);

	const handleNewSkill = useCallback(() => {
		setSkillCreationMode();
	}, [setSkillCreationMode]);

	const handleSaveSkill = useCallback(
		async (data: AgentsTeamSkillInput) => {
			if (editingSkill) {
				await updateSkill(editingSkill.id, data);
			} else {
				await createSkill(data);
			}
		},
		[editingSkill, createSkill, updateSkill]
	);

	const handleEditAgent = useCallback((agent: AgentsTeamAgent) => {
		setEditingAgent(agent);
		setAgentDialogOpen(true);
	}, []);

	const handleNewAgent = useCallback(() => {
		setAgentCreationMode();
	}, [setAgentCreationMode]);

	const handleSaveAgent = useCallback(
		async (data: AgentsTeamAgentInput) => {
			if (editingAgent) {
				await updateAgent(editingAgent.id, data);
			} else {
				await createAgent(data);
			}
		},
		[editingAgent, createAgent, updateAgent]
	);

	const skillDialogProps: SkillDialogProps = {
		open: skillDialogOpen,
		skill: editingSkill,
		onOpenChange: setSkillDialogOpen,
		onSave: handleSaveSkill,
		onDelete: deleteSkill,
	};

	const agentDialogProps: AgentDialogProps = {
		open: agentDialogOpen,
		agent: editingAgent,
		availableSkills: skills,
		onOpenChange: setAgentDialogOpen,
		onSave: handleSaveAgent,
		onDelete: deleteAgent,
	};

	const sidebarConfigHandlers: SidebarConfigHandlers = {
		onEditSkill: handleEditSkill,
		onNewSkill: handleNewSkill,
		onEditAgent: handleEditAgent,
		onNewAgent: handleNewAgent,
	};

	return {
		skillDialogProps,
		agentDialogProps,
		sidebarConfigHandlers,
	};
}
