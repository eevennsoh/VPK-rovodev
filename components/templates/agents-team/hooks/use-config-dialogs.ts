"use client";

import { useCallback, useState } from "react";
import { useCreationModeActions } from "@/app/contexts/context-creation-mode";
import type {
	PlanSkill,
	PlanSkillInput,
	PlanAgent,
	PlanAgentInput,
} from "@/lib/agents-team-config-types";

interface ConfigDialogsInput {
	skills: PlanSkill[];
	createSkill: (data: PlanSkillInput) => Promise<unknown>;
	updateSkill: (id: string, data: Partial<PlanSkillInput>) => Promise<unknown>;
	deleteSkill: (id: string) => Promise<unknown>;
	createAgent: (data: PlanAgentInput) => Promise<unknown>;
	updateAgent: (id: string, data: Partial<PlanAgentInput>) => Promise<unknown>;
	deleteAgent: (id: string) => Promise<unknown>;
}

export interface SkillDialogProps {
	open: boolean;
	skill: PlanSkill | null;
	onOpenChange: (open: boolean) => void;
	onSave: (data: PlanSkillInput) => Promise<unknown>;
	onDelete: (id: string) => Promise<unknown>;
}

export interface AgentDialogProps {
	open: boolean;
	agent: PlanAgent | null;
	availableSkills: PlanSkill[];
	onOpenChange: (open: boolean) => void;
	onSave: (data: PlanAgentInput) => Promise<unknown>;
	onDelete: (id: string) => Promise<unknown>;
}

export interface SidebarConfigHandlers {
	onEditSkill: (skill: PlanSkill) => void;
	onNewSkill: () => void;
	onEditAgent: (agent: PlanAgent) => void;
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
	const [editingSkill, setEditingSkill] = useState<PlanSkill | null>(null);
	const [editingAgent, setEditingAgent] = useState<PlanAgent | null>(null);
	const { setSkillCreationMode, setAgentCreationMode } = useCreationModeActions();

	const handleEditSkill = useCallback((skill: PlanSkill) => {
		setEditingSkill(skill);
		setSkillDialogOpen(true);
	}, []);

	const handleNewSkill = useCallback(() => {
		setSkillCreationMode();
	}, [setSkillCreationMode]);

	const handleSaveSkill = useCallback(
		async (data: PlanSkillInput) => {
			if (editingSkill) {
				await updateSkill(editingSkill.id, data);
			} else {
				await createSkill(data);
			}
		},
		[editingSkill, createSkill, updateSkill]
	);

	const handleEditAgent = useCallback((agent: PlanAgent) => {
		setEditingAgent(agent);
		setAgentDialogOpen(true);
	}, []);

	const handleNewAgent = useCallback(() => {
		setAgentCreationMode();
	}, [setAgentCreationMode]);

	const handleSaveAgent = useCallback(
		async (data: PlanAgentInput) => {
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
