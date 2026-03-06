"use client";

import { useCallback, useState } from "react";
import { useCreationModeActions } from "@/app/contexts/context-creation-mode";
import type {
	PlanSkill,
	PlanSkillInput,
	PlanAgent,
	PlanAgentInput,
} from "@/lib/plan-config-types";

interface ConfigDialogsInput {
	skills: PlanSkill[];
	agents: PlanAgent[];
	createSkill: (data: PlanSkillInput) => Promise<unknown>;
	updateSkill: (name: string, data: Partial<PlanSkillInput>) => Promise<unknown>;
	deleteSkill: (name: string) => Promise<unknown>;
	createAgent: (data: PlanAgentInput) => Promise<unknown>;
	updateAgent: (name: string, data: Partial<PlanAgentInput>) => Promise<unknown>;
	deleteAgent: (name: string) => Promise<unknown>;
	exportSkill: (name: string) => Promise<void>;
	exportAgent: (name: string) => Promise<void>;
	importSkill: (content: string) => Promise<unknown>;
	importAgent: (content: string) => Promise<unknown>;
	availableTools: string[];
}

export interface SkillDialogProps {
	open: boolean;
	skill: PlanSkill | null;
	agents: PlanAgent[];
	onOpenChange: (open: boolean) => void;
	onSave: (data: PlanSkillInput) => Promise<unknown>;
	onDelete: (name: string) => void;
}

export interface AgentDialogProps {
	open: boolean;
	agent: PlanAgent | null;
	availableSkills: PlanSkill[];
	availableTools: string[];
	onOpenChange: (open: boolean) => void;
	onSave: (data: PlanAgentInput) => Promise<unknown>;
	onDelete: (name: string) => void;
	onDuplicate: (agent: PlanAgent) => void;
}

export interface ImportDialogState {
	open: boolean;
	type: "skill" | "agent";
}

export interface DeleteAlertState {
	open: boolean;
	type: "skill" | "agent";
	name: string;
	referencedBy: string[];
}

export interface SidebarConfigHandlers {
	onEditSkill: (skill: PlanSkill) => void;
	onNewSkill: () => void;
	onEditAgent: (agent: PlanAgent) => void;
	onNewAgent: () => void;
	onExportSkill: (name: string) => void;
	onExportAgent: (name: string) => void;
	onImportSkill: () => void;
	onImportAgent: () => void;
}

export function useConfigDialogs({
	skills,
	agents,
	createSkill,
	updateSkill,
	deleteSkill,
	createAgent,
	updateAgent,
	deleteAgent,
	exportSkill,
	exportAgent,
	importSkill,
	importAgent,
	availableTools,
}: ConfigDialogsInput) {
	const [skillDialogOpen, setSkillDialogOpen] = useState(false);
	const [agentDialogOpen, setAgentDialogOpen] = useState(false);
	const [editingSkill, setEditingSkill] = useState<PlanSkill | null>(null);
	const [editingAgent, setEditingAgent] = useState<PlanAgent | null>(null);
	const { setSkillCreationMode, setAgentCreationMode } = useCreationModeActions();

	// Import dialog state
	const [importDialog, setImportDialog] = useState<ImportDialogState>({
		open: false,
		type: "skill",
	});

	// Delete alert state
	const [deleteAlert, setDeleteAlert] = useState<DeleteAlertState>({
		open: false,
		type: "skill",
		name: "",
		referencedBy: [],
	});

	// ---- Skill handlers ----

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
				await updateSkill(editingSkill.name, data);
			} else {
				await createSkill(data);
			}
		},
		[editingSkill, createSkill, updateSkill]
	);

	// ---- Agent handlers ----

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
				await updateAgent(editingAgent.name, data);
			} else {
				await createAgent(data);
			}
		},
		[editingAgent, createAgent, updateAgent]
	);

	const handleDuplicateAgent = useCallback(
		(agent: PlanAgent) => {
			setAgentDialogOpen(false);
			setEditingAgent(null);

			// Open a "new" dialog pre-filled with duplicated data
			const duplicatedAgent: PlanAgent = {
				...agent,
				name: `${agent.name}-copy`,
				isBuiltIn: false,
				filePath: "",
			};
			setEditingAgent(null);

			// Brief delay so the dialog closes and reopens cleanly
			requestAnimationFrame(() => {
				setEditingAgent(null);
				// We create the agent immediately via createAgent
				void createAgent({
					name: duplicatedAgent.name,
					description: duplicatedAgent.description,
					systemPrompt: duplicatedAgent.systemPrompt,
					model: duplicatedAgent.model,
					tools: duplicatedAgent.tools,
					skills: duplicatedAgent.skills,
					disallowedTools: duplicatedAgent.disallowedTools,
					maxTurns: duplicatedAgent.maxTurns,
					permissionMode: duplicatedAgent.permissionMode,
				});
			});
		},
		[createAgent]
	);

	// ---- Delete handlers ----

	const openDeleteAlert = useCallback(
		(type: "skill" | "agent", name: string) => {
			const referencedBy =
				type === "skill"
					? agents.filter((a) => a.skills.includes(name)).map((a) => a.name)
					: [];
			setDeleteAlert({ open: true, type, name, referencedBy });
		},
		[agents]
	);

	const handleDeleteConfirm = useCallback(async () => {
		if (deleteAlert.type === "skill") {
			await deleteSkill(deleteAlert.name);
			setSkillDialogOpen(false);
		} else {
			await deleteAgent(deleteAlert.name);
			setAgentDialogOpen(false);
		}
		setDeleteAlert((prev) => ({ ...prev, open: false }));
	}, [deleteAlert, deleteSkill, deleteAgent]);

	const closeDeleteAlert = useCallback(() => {
		setDeleteAlert((prev) => ({ ...prev, open: false }));
	}, []);

	// ---- Import handlers ----

	const openImportDialog = useCallback((type: "skill" | "agent") => {
		setImportDialog({ open: true, type });
	}, []);

	const closeImportDialog = useCallback(() => {
		setImportDialog((prev) => ({ ...prev, open: false }));
	}, []);

	const handleImport = useCallback(
		async (content: string) => {
			if (importDialog.type === "skill") {
				await importSkill(content);
			} else {
				await importAgent(content);
			}
		},
		[importDialog.type, importSkill, importAgent]
	);

	// ---- Props builders ----

	const skillDialogProps: SkillDialogProps = {
		open: skillDialogOpen,
		skill: editingSkill,
		agents,
		onOpenChange: setSkillDialogOpen,
		onSave: handleSaveSkill,
		onDelete: (name: string) => openDeleteAlert("skill", name),
	};

	const agentDialogProps: AgentDialogProps = {
		open: agentDialogOpen,
		agent: editingAgent,
		availableSkills: skills,
		availableTools,
		onOpenChange: setAgentDialogOpen,
		onSave: handleSaveAgent,
		onDelete: (name: string) => openDeleteAlert("agent", name),
		onDuplicate: handleDuplicateAgent,
	};

	const sidebarConfigHandlers: SidebarConfigHandlers = {
		onEditSkill: handleEditSkill,
		onNewSkill: handleNewSkill,
		onEditAgent: handleEditAgent,
		onNewAgent: handleNewAgent,
		onExportSkill: (name: string) => void exportSkill(name),
		onExportAgent: (name: string) => void exportAgent(name),
		onImportSkill: () => openImportDialog("skill"),
		onImportAgent: () => openImportDialog("agent"),
	};

	return {
		skillDialogProps,
		agentDialogProps,
		sidebarConfigHandlers,
		importDialog,
		closeImportDialog,
		handleImport,
		deleteAlert,
		closeDeleteAlert,
		handleDeleteConfirm,
	};
}
