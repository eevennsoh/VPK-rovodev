"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_ENDPOINTS } from "@/lib/api-config";
import type {
	PlanSkill,
	PlanSkillInput,
	PlanAgent,
	PlanAgentInput,
} from "@/lib/agents-team-config-types";
import {
	DEFAULT_SKILLS,
	DEFAULT_AGENTS,
} from "@/lib/agents-team-config-seed";

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

export function usePlanConfig() {
	const [skills, setSkills] = useState<PlanSkill[]>(DEFAULT_SKILLS);
	const [agents, setAgents] = useState<PlanAgent[]>(DEFAULT_AGENTS);
	const [isLoading, setIsLoading] = useState(false);
	const hasFetchedRef = useRef(false);

	const fetchSkills = useCallback(async () => {
		try {
			const response = await fetch(API_ENDPOINTS.PLAN_SKILLS);
			if (!response.ok) return;
			const data = await parseJsonResponse<{ skills: PlanSkill[] }>(response, "fetch skills");
			if (!data) return;
			setSkills(data.skills);
		} catch (error) {
			console.error("Failed to fetch skills:", error);
		}
	}, []);

	const fetchAgents = useCallback(async () => {
		try {
			const response = await fetch(API_ENDPOINTS.PLAN_AGENTS);
			if (!response.ok) return;
			const data = await parseJsonResponse<{ agents: PlanAgent[] }>(response, "fetch agents");
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
		if (hasFetchedRef.current) return;
		hasFetchedRef.current = true;

		let cancelled = false;
		async function load() {
			const [skillsRes, agentsRes] = await Promise.all([
				fetch(API_ENDPOINTS.PLAN_SKILLS).catch(() => null),
				fetch(API_ENDPOINTS.PLAN_AGENTS).catch(() => null),
			]);
			if (cancelled) return;

			if (skillsRes?.ok) {
				const data = await parseJsonResponse<{ skills: PlanSkill[] }>(
					skillsRes,
					"load skills"
				);
				if (data) {
					setSkills(data.skills);
				}
			}
			if (agentsRes?.ok) {
				const data = await parseJsonResponse<{ agents: PlanAgent[] }>(
					agentsRes,
					"load agents"
				);
				if (data) {
					setAgents(data.agents);
				}
			}
		}

		void load();
		return () => {
			cancelled = true;
		};
	}, []);

	const createSkill = useCallback(
		async (data: PlanSkillInput): Promise<PlanSkill | null> => {
			try {
				const response = await fetch(API_ENDPOINTS.PLAN_SKILLS, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				});
				if (!response.ok) return null;
				const result = await parseJsonResponse<{ skill: PlanSkill }>(
					response,
					"create skill"
				);
				if (!result) return null;
				setSkills((prev) => [...prev, result.skill]);
				// Persist to seed files in background
				fetch(API_ENDPOINTS.planSkillPersist(result.skill.id), { method: "POST" }).catch(() => {});
				return result.skill;
			} catch (error) {
				console.error("Failed to create skill:", error);
				return null;
			}
		},
		[]
	);

	const updateSkill = useCallback(
		async (id: string, data: Partial<PlanSkillInput>): Promise<PlanSkill | null> => {
			try {
				const response = await fetch(API_ENDPOINTS.planSkill(id), {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				});
				if (!response.ok) return null;
				const result = await parseJsonResponse<{ skill: PlanSkill }>(
					response,
					"update skill"
				);
				if (!result) return null;
				setSkills((prev) =>
					prev.map((s) => (s.id === id ? result.skill : s))
				);
				return result.skill;
			} catch (error) {
				console.error("Failed to update skill:", error);
				return null;
			}
		},
		[]
	);

	const deleteSkill = useCallback(async (id: string): Promise<boolean> => {
		try {
			const response = await fetch(API_ENDPOINTS.planSkill(id), {
				method: "DELETE",
			});
			if (!response.ok) return false;
			setSkills((prev) => prev.filter((s) => s.id !== id));
			return true;
		} catch (error) {
			console.error("Failed to delete skill:", error);
			return false;
		}
	}, []);

	const createAgent = useCallback(
		async (data: PlanAgentInput): Promise<PlanAgent | null> => {
			try {
				const response = await fetch(API_ENDPOINTS.PLAN_AGENTS, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				});
				if (!response.ok) return null;
				const result = await parseJsonResponse<{ agent: PlanAgent }>(
					response,
					"create agent"
				);
				if (!result) return null;
				setAgents((prev) => [...prev, result.agent]);
				// Persist to seed files in background
				fetch(API_ENDPOINTS.planAgentPersist(result.agent.id), { method: "POST" }).catch(() => {});
				return result.agent;
			} catch (error) {
				console.error("Failed to create agent:", error);
				return null;
			}
		},
		[]
	);

	const updateAgent = useCallback(
		async (id: string, data: Partial<PlanAgentInput>): Promise<PlanAgent | null> => {
			try {
				const response = await fetch(API_ENDPOINTS.planAgent(id), {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				});
				if (!response.ok) return null;
				const result = await parseJsonResponse<{ agent: PlanAgent }>(
					response,
					"update agent"
				);
				if (!result) return null;
				setAgents((prev) =>
					prev.map((a) => (a.id === id ? result.agent : a))
				);
				return result.agent;
			} catch (error) {
				console.error("Failed to update agent:", error);
				return null;
			}
		},
		[]
	);

	const deleteAgent = useCallback(async (id: string): Promise<boolean> => {
		try {
			const response = await fetch(API_ENDPOINTS.planAgent(id), {
				method: "DELETE",
			});
			if (!response.ok) return false;
			setAgents((prev) => prev.filter((a) => a.id !== id));
			return true;
		} catch (error) {
			console.error("Failed to delete agent:", error);
			return false;
		}
	}, []);

	return {
		skills,
		agents,
		isLoading,
		createSkill,
		updateSkill,
		deleteSkill,
		createAgent,
		updateAgent,
		deleteAgent,
		refresh,
	};
}
