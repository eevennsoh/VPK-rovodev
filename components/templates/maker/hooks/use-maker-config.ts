"use client";

import { useCallback, useEffect, useState } from "react";
import { API_ENDPOINTS } from "@/lib/api-config";
import type {
	MakerSkill,
	MakerSkillInput,
	MakerAgent,
	MakerAgentInput,
} from "@/lib/maker-config-types";
import { generateSlug } from "@/lib/maker-config-types";

async function parseJsonResponse<T>(
	response: Response,
	requestLabel: string
): Promise<T | null> {
	const contentType = response.headers.get("content-type") ?? "";
	if (!contentType.includes("application/json")) {
		const responseBody = await response.text().catch(() => "");
		console.error(`[AGENTS-CONFIG] Expected JSON for ${requestLabel} but received non-JSON response`, {
			status: response.status,
			contentType,
			bodyPreview: responseBody.slice(0, 200),
		});
		return null;
	}

	try {
		return (await response.json()) as T;
	} catch (error) {
		console.error(`[AGENTS-CONFIG] Failed to parse JSON for ${requestLabel}:`, error);
		return null;
	}
}

function triggerDownload(content: string, filename: string) {
	const blob = new Blob([content], { type: "text/markdown" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

export function useMakerConfig() {
	const [skills, setSkills] = useState<MakerSkill[]>([]);
	const [agents, setAgents] = useState<MakerAgent[]>([]);
	const [availableTools, setAvailableTools] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const fetchSkills = useCallback(async () => {
		try {
			const response = await fetch(API_ENDPOINTS.MAKER_SKILLS);
			if (!response.ok) return;
			const data = await parseJsonResponse<{ skills: MakerSkill[] }>(response, "fetch skills");
			if (!data) return;
			setSkills(data.skills);
		} catch (error) {
			console.error("Failed to fetch skills:", error);
		}
	}, []);

	const fetchAgents = useCallback(async () => {
		try {
			const response = await fetch(API_ENDPOINTS.MAKER_AGENTS);
			if (!response.ok) return;
			const data = await parseJsonResponse<{ agents: MakerAgent[] }>(response, "fetch agents");
			if (!data) return;
			setAgents(data.agents);
		} catch (error) {
			console.error("Failed to fetch agents:", error);
		}
	}, []);

	const refresh = useCallback(async () => {
		setIsLoading(true);
		await Promise.all([fetchSkills(), fetchAgents()]);
		setIsLoading(false);
	}, [fetchSkills, fetchAgents]);

	useEffect(() => {
		let cancelled = false;
		async function load() {
			const [skillsRes, agentsRes, toolsRes] = await Promise.all([
				fetch(API_ENDPOINTS.MAKER_SKILLS).catch(() => null),
				fetch(API_ENDPOINTS.MAKER_AGENTS).catch(() => null),
				fetch(API_ENDPOINTS.MAKER_TOOLS).catch(() => null),
			]);
			if (cancelled) return;

			if (skillsRes?.ok) {
				const data = await parseJsonResponse<{ skills: MakerSkill[] }>(
					skillsRes,
					"load skills"
				);
				if (data) {
					setSkills(data.skills);
				}
			}
			if (agentsRes?.ok) {
				const data = await parseJsonResponse<{ agents: MakerAgent[] }>(
					agentsRes,
					"load agents"
				);
				if (data) {
					setAgents(data.agents);
				}
			}
			if (toolsRes?.ok) {
				const data = await parseJsonResponse<{ tools: string[] }>(
					toolsRes,
					"load tools"
				);
				if (data) {
					setAvailableTools(data.tools);
				}
			}
		}

		void load();
		return () => {
			cancelled = true;
		};
	}, []);

	const createSkill = useCallback(
		async (data: MakerSkillInput): Promise<MakerSkill | null> => {
			try {
				const response = await fetch(API_ENDPOINTS.MAKER_SKILLS, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				});
				if (!response.ok) return null;
				const result = await parseJsonResponse<{ skill: MakerSkill }>(
					response,
					"create skill"
				);
				if (!result) return null;
				setSkills((prev) => [...prev, result.skill]);
				return result.skill;
			} catch (error) {
				console.error("Failed to create skill:", error);
				return null;
			}
		},
		[]
	);

	const updateSkill = useCallback(
		async (name: string, data: Partial<MakerSkillInput>): Promise<MakerSkill | null> => {
			try {
				const response = await fetch(API_ENDPOINTS.makerSkill(name), {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				});
				if (!response.ok) return null;
				const result = await parseJsonResponse<{ skill: MakerSkill }>(
					response,
					"update skill"
				);
				if (!result) return null;
				setSkills((prev) =>
					prev.map((s) => (s.name === name ? result.skill : s))
				);
				return result.skill;
			} catch (error) {
				console.error("Failed to update skill:", error);
				return null;
			}
		},
		[]
	);

	const deleteSkill = useCallback(async (name: string): Promise<boolean> => {
		try {
			const response = await fetch(API_ENDPOINTS.makerSkill(name), {
				method: "DELETE",
			});
			if (!response.ok) return false;
			setSkills((prev) => prev.filter((s) => s.name !== name));
			return true;
		} catch (error) {
			console.error("Failed to delete skill:", error);
			return false;
		}
	}, []);

	const createAgent = useCallback(
		async (data: MakerAgentInput): Promise<MakerAgent | null> => {
			try {
				const response = await fetch(API_ENDPOINTS.MAKER_AGENTS, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				});
				if (!response.ok) return null;
				const result = await parseJsonResponse<{ agent: MakerAgent }>(
					response,
					"create agent"
				);
				if (!result) return null;
				setAgents((prev) => [...prev, result.agent]);
				return result.agent;
			} catch (error) {
				console.error("Failed to create agent:", error);
				return null;
			}
		},
		[]
	);

	const updateAgent = useCallback(
		async (name: string, data: Partial<MakerAgentInput>): Promise<MakerAgent | null> => {
			try {
				const response = await fetch(API_ENDPOINTS.makerAgent(name), {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				});
				if (!response.ok) return null;
				const result = await parseJsonResponse<{ agent: MakerAgent }>(
					response,
					"update agent"
				);
				if (!result) return null;
				setAgents((prev) =>
					prev.map((a) => (a.name === name ? result.agent : a))
				);
				return result.agent;
			} catch (error) {
				console.error("Failed to update agent:", error);
				return null;
			}
		},
		[]
	);

	const deleteAgent = useCallback(async (name: string): Promise<boolean> => {
		try {
			const response = await fetch(API_ENDPOINTS.makerAgent(name), {
				method: "DELETE",
			});
			if (!response.ok) return false;
			setAgents((prev) => prev.filter((a) => a.name !== name));
			return true;
		} catch (error) {
			console.error("Failed to delete agent:", error);
			return false;
		}
	}, []);

	const exportSkill = useCallback(async (name: string) => {
		try {
			const response = await fetch(API_ENDPOINTS.makerSkillRaw(name));
			if (!response.ok) return;
			const content = await response.text();
			triggerDownload(content, `${generateSlug(name)}.md`);
		} catch (error) {
			console.error("Failed to export skill:", error);
		}
	}, []);

	const exportAgent = useCallback(async (name: string) => {
		try {
			const response = await fetch(API_ENDPOINTS.makerAgentRaw(name));
			if (!response.ok) return;
			const content = await response.text();
			triggerDownload(content, `${generateSlug(name)}.md`);
		} catch (error) {
			console.error("Failed to export agent:", error);
		}
	}, []);

	const importSkill = useCallback(
		async (content: string): Promise<MakerSkill | null> => {
			try {
				const response = await fetch(API_ENDPOINTS.MAKER_SKILLS, {
					method: "POST",
					headers: { "Content-Type": "text/markdown" },
					body: content,
				});
				if (!response.ok) return null;
				const result = await parseJsonResponse<{ skill: MakerSkill }>(
					response,
					"import skill"
				);
				if (!result) return null;
				setSkills((prev) => [...prev, result.skill]);
				return result.skill;
			} catch (error) {
				console.error("Failed to import skill:", error);
				return null;
			}
		},
		[]
	);

	const importAgent = useCallback(
		async (content: string): Promise<MakerAgent | null> => {
			try {
				const response = await fetch(API_ENDPOINTS.MAKER_AGENTS, {
					method: "POST",
					headers: { "Content-Type": "text/markdown" },
					body: content,
				});
				if (!response.ok) return null;
				const result = await parseJsonResponse<{ agent: MakerAgent }>(
					response,
					"import agent"
				);
				if (!result) return null;
				setAgents((prev) => [...prev, result.agent]);
				return result.agent;
			} catch (error) {
				console.error("Failed to import agent:", error);
				return null;
			}
		},
		[]
	);

	return {
		skills,
		agents,
		availableTools,
		isLoading,
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
		refresh,
	};
}
