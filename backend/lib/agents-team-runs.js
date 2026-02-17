const fs = require("node:fs/promises");
const path = require("node:path");
const { generateTextViaRovoDev } = require("./rovodev-gateway");
const { getGenuiSummarySystemPrompt } = require("./genui-system-prompt");
const { analyzeGeneratedText, pickBestSpec } = require("./genui-spec-utils");

const TERMINAL_TASK_STATUSES = new Set(["done", "failed", "blocked-failed"]);
const FAILURE_TASK_STATUSES = new Set(["failed", "blocked-failed"]);
const RUN_STATUS_RUNNING = "running";
const RUN_STATUS_COMPLETED = "completed";
const RUN_STATUS_FAILED = "failed";

function getNonEmptyString(value) {
	if (typeof value !== "string") {
		return null;
	}

	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : null;
}

function createId(prefix) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function slugifyAgentName(value) {
	const fallback = "agent";
	if (!value) {
		return fallback;
	}

	const normalizedValue = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return normalizedValue || fallback;
}

function delay(milliseconds) {
	return new Promise((resolve) => {
		setTimeout(resolve, milliseconds);
	});
}

function safeJsonParse(rawValue) {
	try {
		return JSON.parse(rawValue);
	} catch {
		return null;
	}
}

function toIsoDate() {
	return new Date().toISOString();
}

function normalizePlan(rawPlan) {
	if (!rawPlan || typeof rawPlan !== "object") {
		return null;
	}

	const planRecord = rawPlan;
	const title =
		getNonEmptyString(planRecord.title) ||
		getNonEmptyString(planRecord.name) ||
		"Execution plan";
	const description = getNonEmptyString(planRecord.description) || undefined;
	const emoji = getNonEmptyString(planRecord.emoji) || undefined;
	const rawTasks = Array.isArray(planRecord.tasks) ? planRecord.tasks : [];
	if (rawTasks.length === 0) {
		return null;
	}

	const seenTaskIds = new Set();
	const provisionalTasks = rawTasks
		.map((rawTask, index) => {
			if (!rawTask || typeof rawTask !== "object") {
				return null;
			}

			const taskRecord = rawTask;
			const label =
				getNonEmptyString(taskRecord.label) ||
				getNonEmptyString(taskRecord.title) ||
				getNonEmptyString(taskRecord.task);
			if (!label) {
				return null;
			}

			const taskIdFallback = `task-${index + 1}`;
			let taskId = getNonEmptyString(taskRecord.id) || taskIdFallback;
			while (seenTaskIds.has(taskId)) {
				taskId = `${taskIdFallback}-${Math.random().toString(36).slice(2, 5)}`;
			}
			seenTaskIds.add(taskId);

			const agentName = getNonEmptyString(taskRecord.agent) || "Rovo";
			const agentId = slugifyAgentName(agentName);
			const blockedBy = Array.isArray(taskRecord.blockedBy)
				? taskRecord.blockedBy
						.map((dependencyId) => getNonEmptyString(dependencyId))
						.filter(Boolean)
				: [];

			return {
				id: taskId,
				label,
				agentName,
				agentId,
				blockedBy,
			};
		})
		.filter(Boolean);

	if (provisionalTasks.length === 0) {
		return null;
	}

	const taskIdSet = new Set(provisionalTasks.map((task) => task.id));
	const tasks = provisionalTasks.map((task) => ({
		...task,
		blockedBy: task.blockedBy.filter(
			(dependencyId) => dependencyId !== task.id && taskIdSet.has(dependencyId)
		),
	}));
	const agents = Array.from(
		new Set(tasks.map((task) => task.agentName))
	).sort();

	return {
		title,
		description,
		emoji,
		agents,
		tasks,
	};
}

function buildConversationContext(rawConversation) {
	if (!Array.isArray(rawConversation)) {
		return [];
	}

	return rawConversation
		.map((entry) => {
			if (!entry || typeof entry !== "object") {
				return null;
			}

			const type =
				entry.role === "assistant" || entry.type === "assistant"
					? "assistant"
					: "user";
			const content =
				getNonEmptyString(entry.content) || getNonEmptyString(entry.text) || null;
			if (!content) {
				return null;
			}

			return {
				type,
				content,
			};
		})
		.filter(Boolean)
		.slice(-20);
}

function buildRunPaths(baseDir, runId) {
	const runDir = path.join(baseDir, runId);
	return {
		runDir,
		runFilePath: path.join(runDir, "run.json"),
		summaryJsonPath: path.join(runDir, "summary.json"),
		summaryMarkdownPath: path.join(runDir, "summary.md"),
		visualSummaryJsonPath: path.join(runDir, "visual-summary.json"),
		visualSummaryHtmlPath: path.join(runDir, "visual-summary.html"),
		genuiSummaryJsonPath: path.join(runDir, "genui-summary.json"),
		agentsDir: path.join(runDir, "agents"),
		tasksDir: path.join(runDir, "tasks"),
	};
}

function createInitialRun({ runId, plan, userPrompt, conversationContext, customInstruction }) {
	const now = toIsoDate();
	const tasks = plan.tasks.map((task) => ({
		id: task.id,
		label: task.label,
		agentName: task.agentName,
		agentId: task.agentId,
		blockedBy: task.blockedBy,
		status: "todo",
		attempts: 0,
		startedAt: null,
		completedAt: null,
		error: null,
		output: null,
		outputSummary: null,
	}));

	const agents = Array.from(
		new Map(
			tasks.map((task) => [
				task.agentId,
				{
					agentId: task.agentId,
					agentName: task.agentName,
					status: "idle",
					currentTaskId: null,
					currentTaskLabel: null,
					latestContent: "",
					updatedAt: now,
				},
			]),
		).values()
	);

	return {
		id: runId,
		status: RUN_STATUS_RUNNING,
		error: null,
		createdAt: now,
		updatedAt: now,
		completedAt: null,
		plan: {
			title: plan.title,
			description: plan.description,
			emoji: plan.emoji,
			agents: plan.agents,
			tasks: tasks.map((task) => ({
				id: task.id,
				label: task.label,
				agent: task.agentName,
				blockedBy: task.blockedBy,
			})),
		},
		tasks,
		agents,
		directives: [],
		summary: null,
		visualSummary: null,
		genuiSummary: null,
		userPrompt: userPrompt || "",
		customInstruction: customInstruction || undefined,
		conversationContext,
		events: [],
		subscribers: new Set(),
	};
}

function toSerializableRun(run) {
	return {
		runId: run.id,
		status: run.status,
		error: run.error,
		createdAt: run.createdAt,
		updatedAt: run.updatedAt,
		completedAt: run.completedAt,
		plan: run.plan,
		tasks: run.tasks,
		agents: run.agents,
		directives: run.directives,
		summary: run.summary,
		visualSummary: run.visualSummary,
		genuiSummary: run.genuiSummary,
		userPrompt: run.userPrompt,
		customInstruction: run.customInstruction,
		conversationContext: run.conversationContext,
	};
}

function buildSseEvent(type, payload = {}) {
	return {
		type,
		timestamp: toIsoDate(),
		...payload,
	};
}

function buildAgentExecutionUpdate(task, agent, status, content) {
	return {
		agentId: agent.agentId,
		agentName: agent.agentName,
		taskId: task.id,
		taskLabel: task.label,
		status,
		content,
	};
}

function toTaskSummaryText(task) {
	if (!task.output) {
		return "No output generated.";
	}

	const cleanedText = task.output.trim();
	if (cleanedText.length <= 320) {
		return cleanedText;
	}

	return `${cleanedText.slice(0, 317)}...`;
}

function createSkillSection(skillContents) {
	return Array.isArray(skillContents) && skillContents.length > 0
		? skillContents
				.map((skill) => `### ${skill.name}\n${skill.content}`)
				.join("\n\n")
		: null;
}

function createTaskPrompt(run, task, dependencyOutputs, directivesForAgent, skillContents) {
	const skillSection = createSkillSection(skillContents);
	const dependencySection =
		dependencyOutputs.length > 0
			? dependencyOutputs
					.map(
						(item) =>
							`- ${item.taskId}: ${item.taskLabel}\n${item.output}`
					)
					.join("\n\n")
			: "- None";
	const directivesSection =
		directivesForAgent.length > 0
			? directivesForAgent
					.map((directive) => `- ${directive.message}`)
					.join("\n")
			: "- None";

	return [
		`You are ${task.agentName}, an expert contributor in a multi-agent plan.`,
		`Plan: ${run.plan.title}`,
		run.plan.description ? `Plan description: ${run.plan.description}` : null,
		`Your task ID: ${task.id}`,
		`Your task: ${task.label}`,
		"",
		skillSection ? "## Equipped Skills\n" : null,
		skillSection,
		skillSection ? "" : null,
		"Dependency outputs:",
		dependencySection,
		"",
		"Latest directives for you:",
		directivesSection,
		"",
		"Produce concrete output that can be combined with other agents.",
		"Response requirements:",
		"- Use markdown with short headings.",
		"- Include assumptions and risks if relevant.",
		"- End with a concise deliverable summary.",
	]
		.filter((line) => line !== null)
		.join("\n");
}

function createSummaryPrompt(run) {
	const taskSections = run.tasks
		.map((task) => {
			const taskOutput = task.output?.trim() || "No output generated.";
			return [
				`Task ${task.id} (${task.agentName})`,
				`Label: ${task.label}`,
				`Status: ${task.status}`,
				"Output:",
				taskOutput,
			].join("\n");
		})
		.join("\n\n---\n\n");

	return [
		`Synthesize a final report for the plan "${run.plan.title}".`,
		run.plan.description ? `Plan description: ${run.plan.description}` : null,
		run.status === RUN_STATUS_FAILED
			? "Some tasks failed or were blocked. Clearly state what is complete vs missing."
			: "All tasks completed successfully.",
		"",
		"Produce a single cohesive markdown report with:",
		"1) Executive summary",
		"2) Detailed outcomes by theme",
		"3) Open risks / decisions",
		"4) Recommended next actions",
		"",
		"Task outputs:",
		taskSections,
	]
		.filter(Boolean)
		.join("\n");
}

function createFallbackSummary(run) {
	const lines = [
		`# ${run.plan.title}`,
		run.plan.description ? `${run.plan.description}\n` : null,
		"## Executive summary",
		run.status === RUN_STATUS_FAILED
			? "Execution finished with partial completion due to failed or blocked tasks."
			: "Execution completed successfully across all planned tasks.",
		"",
		"## Task outcomes",
		...run.tasks
			.map(
			(task) =>
				`### ${task.id} · ${task.label} (${task.agentName})\nStatus: ${task.status}\n\n${task.output || "No output generated."}`
		),
	];

	return lines.filter(Boolean).join("\n\n");
}

function createVisualSummaryPrompt(run, summaryContent, skillContents) {
	const taskSections = run.tasks
		.map((task) => {
			return [
				`Task ${task.id} (${task.agentName})`,
				`Label: ${task.label}`,
				`Status: ${task.status}`,
				"Output:",
				task.output?.trim() || task.error || "No output generated.",
			].join("\n");
		})
		.join("\n\n---\n\n");

	const skillSection = createSkillSection(skillContents);

	return [
		`Create a polished, user-facing HTML summary page for the plan "${run.plan.title}".`,
		run.plan.description ? `Plan description: ${run.plan.description}` : null,
		run.status === RUN_STATUS_FAILED
			? "This run has partial completion due to failed or blocked tasks."
			: "This run completed successfully.",
		"",
		skillSection ? "## Equipped Skills\n" : null,
		skillSection,
		skillSection ? "" : null,
		"Use the task outcomes and markdown summary below as source material.",
		"Return only HTML (no markdown fences, no commentary).",
		"The HTML must be self-contained with inline CSS and no external scripts.",
		"Include sections for status, key outcomes, task-by-task results, and next actions.",
		"",
		"Markdown summary:",
		summaryContent,
		"",
		"Task outputs:",
		taskSections,
	]
		.filter(Boolean)
		.join("\n");
}

function createGenuiSummaryPrompt(run, summaryContent) {
	const taskSections = run.tasks
		.map((task) => {
			return [
				`Task ${task.id} (${task.agentName})`,
				`Label: ${task.label}`,
				`Status: ${task.status}`,
				"Output:",
				task.output?.trim() || task.error || "No output generated.",
			].join("\n");
		})
		.join("\n\n---\n\n");

	return [
		`Create an interactive summary dashboard for the plan "${run.plan.title}".`,
		run.plan.description ? `Plan description: ${run.plan.description}` : null,
		run.status === RUN_STATUS_FAILED
			? "This run has partial completion due to failed or blocked tasks."
			: "This run completed successfully.",
		"",
		"Use the task outcomes and markdown summary below as source material.",
		"Output exactly one ```spec block with valid RFC 6902 JSON patch lines.",
		"",
		"Markdown summary:",
		summaryContent,
		"",
		"Task outputs:",
		taskSections,
	]
		.filter(Boolean)
		.join("\n");
}

function stripCodeFence(value) {
	const trimmed = value.trim();
	if (!trimmed.startsWith("```")) {
		return trimmed;
	}

	const lines = trimmed.split("\n");
	if (lines.length <= 2) {
		return trimmed;
	}

	const firstLine = lines[0].trim();
	const lastLine = lines[lines.length - 1].trim();
	if (!firstLine.startsWith("```") || lastLine !== "```") {
		return trimmed;
	}

	return lines.slice(1, -1).join("\n").trim();
}

function ensureHtmlDocument(htmlCandidate, title) {
	const normalized = stripCodeFence(htmlCandidate);
	const containsHtmlTag = /<\s*html[\s>]/i.test(normalized);
	if (containsHtmlTag) {
		return normalized;
	}

	return [
		"<!DOCTYPE html>",
		'<html lang="en">',
		"<head>",
		'<meta charset="utf-8" />',
		'<meta name="viewport" content="width=device-width, initial-scale=1" />',
		`<title>${title}</title>`,
		"</head>",
		"<body>",
		normalized,
		"</body>",
		"</html>",
	].join("\n");
}

function escapeHtml(value) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function createFallbackVisualSummaryHtml(run, summaryContent) {
	const statusText =
		run.status === RUN_STATUS_FAILED ? "Partial completion" : "Completed";
	const escapedSummary = escapeHtml(summaryContent || "Summary unavailable.");

	return [
		"<!DOCTYPE html>",
		'<html lang="en">',
		"<head>",
		'<meta charset="utf-8" />',
		'<meta name="viewport" content="width=device-width, initial-scale=1" />',
		`<title>${escapeHtml(run.plan.title)} visual summary</title>`,
		"<style>",
		"body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; background: #f7f8f9; color: #172b4d; }",
		".page { max-width: 960px; margin: 24px auto; padding: 24px; background: #fff; border: 1px solid #dfe1e6; border-radius: 12px; }",
		".meta { color: #44546f; font-size: 14px; margin-bottom: 16px; }",
		"pre { white-space: pre-wrap; line-height: 1.5; font-size: 14px; background: #f1f2f4; border-radius: 8px; padding: 16px; }",
		"</style>",
		"</head>",
		"<body>",
		'<main class="page">',
		`<h1>${escapeHtml(run.plan.title)}</h1>`,
		`<p class="meta">Status: ${escapeHtml(statusText)}</p>`,
		"<pre>",
		escapedSummary,
		"</pre>",
		"</main>",
		"</body>",
		"</html>",
	].join("\n");
}

function createRunManager(options) {
	const {
		baseDir,
		buildSystemPrompt,
		configManager,
		logger = console,
	} = options;
	const persistenceMode = process.env.AGENTS_TEAM_PERSIST_MODE?.trim().toLowerCase() || "final-only";
	const persistIntermediateSnapshots = persistenceMode !== "final-only";
	const runsById = new Map();
	const runRootsDir = path.join(baseDir, "agents-team-runs");

	const ensureRunDirectories = async (runId) => {
		const paths = buildRunPaths(runRootsDir, runId);
		await fs.mkdir(paths.runDir, { recursive: true });
		await fs.mkdir(paths.agentsDir, { recursive: true });
		await fs.mkdir(paths.tasksDir, { recursive: true });
		return paths;
	};

	const writeJsonFile = async (filePath, payload) => {
		await fs.mkdir(path.dirname(filePath), { recursive: true });
		await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
	};

	const persistRunSnapshot = async (run) => {
		const paths = await ensureRunDirectories(run.id);
		await writeJsonFile(paths.runFilePath, toSerializableRun(run));

		await Promise.all(
			run.agents.map((agent) => {
				const agentOutputs = run.tasks
					.filter((task) => task.agentId === agent.agentId && task.output)
					.map((task) => ({
						taskId: task.id,
						taskLabel: task.label,
						status: task.status,
						attempts: task.attempts,
						startedAt: task.startedAt,
						completedAt: task.completedAt,
						output: task.output,
					}));

				return writeJsonFile(path.join(paths.agentsDir, `${agent.agentId}.json`), {
					runId: run.id,
					agentId: agent.agentId,
					agentName: agent.agentName,
					updatedAt: run.updatedAt,
					outputs: agentOutputs,
				});
			})
		);

		await Promise.all(
			run.tasks.map((task) =>
				writeJsonFile(path.join(paths.tasksDir, `${task.id}.json`), {
					runId: run.id,
					task,
				})
			)
		);

		if (run.summary) {
			await writeJsonFile(paths.summaryJsonPath, run.summary);
			await fs.writeFile(paths.summaryMarkdownPath, run.summary.content, "utf8");
		}

		if (run.visualSummary) {
			await writeJsonFile(paths.visualSummaryJsonPath, run.visualSummary);
			await fs.writeFile(paths.visualSummaryHtmlPath, run.visualSummary.html, "utf8");
		}

		if (run.genuiSummary) {
			await writeJsonFile(paths.genuiSummaryJsonPath, run.genuiSummary);
		}
	};

	const persistIntermediateSnapshot = async (run) => {
		if (!persistIntermediateSnapshots) {
			return;
		}

		await persistRunSnapshot(run);
	};

	const broadcastEvent = (run, event) => {
		const eventPayload = `${JSON.stringify(event)}\n\n`;
		run.events.push(event);
		if (run.events.length > 200) {
			run.events = run.events.slice(-200);
		}

		for (const subscriber of run.subscribers) {
			try {
				subscriber.write(`data: ${eventPayload}`);
			} catch (error) {
				logger.warn?.("[AGENTS-RUN] Failed to emit SSE event", error);
				run.subscribers.delete(subscriber);
			}
		}
	};

	const updateRunTimestamp = (run) => {
		run.updatedAt = toIsoDate();
	};

	const emitRunStateEvent = (run, type, payload = {}) => {
		broadcastEvent(
			run,
			buildSseEvent(type, {
				run: toSerializableRun(run),
				...payload,
			})
		);
	};

	const markBlockedTasksWithFailedDependencies = (run) => {
		let changed = false;

		for (const task of run.tasks) {
			if (task.status !== "todo") {
				continue;
			}

			const failedDependency = task.blockedBy.find((dependencyId) => {
				const dependencyTask = run.tasks.find((item) => item.id === dependencyId);
				return dependencyTask && FAILURE_TASK_STATUSES.has(dependencyTask.status);
			});
			if (!failedDependency) {
				continue;
			}

			task.status = "blocked-failed";
			task.completedAt = toIsoDate();
			task.error = `Blocked by failed dependency: ${failedDependency}`;
			changed = true;
			updateRunTimestamp(run);
			emitRunStateEvent(run, "task.blocked", { taskId: task.id });
		}

		return changed;
	};

	const getDependencyOutputs = (run, task) => {
		return task.blockedBy
			.map((dependencyId) => run.tasks.find((item) => item.id === dependencyId))
			.filter((dependencyTask) => dependencyTask && dependencyTask.status === "done")
			.map((dependencyTask) => ({
				taskId: dependencyTask.id,
				taskLabel: dependencyTask.label,
				output: dependencyTask.output || "No output generated.",
			}));
	};

	const getAgentByTask = (run, task) => {
		return run.agents.find((agent) => agent.agentId === task.agentId) || null;
	};

	const findConfiguredAgentByName = (agentName) => {
		if (!configManager || !agentName) {
			return null;
		}

		const configAgents = configManager.listAgents();
		return (
			configAgents.find(
				(agent) => agent.name.toLowerCase() === agentName.toLowerCase()
			) || null
		);
	};

	const resolveSkillContentsForAgentName = (agentName) => {
		const configuredAgent = findConfiguredAgentByName(agentName);
		if (
			!configuredAgent ||
			!Array.isArray(configuredAgent.equippedSkills) ||
			configuredAgent.equippedSkills.length === 0
		) {
			return [];
		}

		return configManager.resolveSkillContents(configuredAgent.equippedSkills);
	};

	const callGatewayForMarkdown = async ({
		prompt,
		conversationHistory,
		contextDescription,
		customSystemPrompt,
		userName,
		conflictPolicy,
	}) => {
		const systemPrompt = customSystemPrompt || (buildSystemPrompt
			? buildSystemPrompt(userName, null, "ask")
			: "You are a helpful AI assistant.");

		// Build the user message with context
		let userMessage = prompt;
		if (conversationHistory && conversationHistory.length > 0) {
			const historyText = conversationHistory
				.map((msg) => `${msg.type === "user" ? "User" : "Assistant"}: ${msg.content}`)
				.join("\n");
			userMessage = `Previous conversation context:\n${historyText}\n\nCurrent question: ${prompt}`;
		}
		if (contextDescription) {
			userMessage = `${contextDescription}\n\n${userMessage}`;
		}

		// Use RovoDev Serve for agent team runs
		const result = await generateTextViaRovoDev({
			system: systemPrompt,
			prompt: userMessage,
			conflictPolicy,
		});
		return result.trim();
	};

	const isAgentBusy = (run, agentId) =>
		run.tasks.some(
			(t) => t.agentId === agentId && t.status === "in-progress"
		);

	const runTask = async (run, task) => {
		const agent = getAgentByTask(run, task);
		if (!agent) {
			throw new Error(`Agent not found for task ${task.id}`);
		}

		task.status = "in-progress";
		task.startedAt = toIsoDate();
		task.completedAt = null;
		task.error = null;
		task.attempts += 1;
		agent.status = "working";
		agent.currentTaskId = task.id;
		agent.currentTaskLabel = task.label;
		agent.updatedAt = toIsoDate();
		updateRunTimestamp(run);

		const claimedUpdate = buildAgentExecutionUpdate(
			task,
			agent,
			"working",
			`Claimed task ${task.id}: ${task.label}`
		);
		emitRunStateEvent(run, "task.claimed", {
			taskId: task.id,
			update: claimedUpdate,
		});
		await persistIntermediateSnapshot(run);

		const dependencyOutputs = getDependencyOutputs(run, task);
		const directivesForAgent = run.directives.filter(
			(directive) => directive.agentId === agent.agentId
		);

		const skillContents = resolveSkillContentsForAgentName(task.agentName);

		const taskPrompt = createTaskPrompt(
			run,
			task,
			dependencyOutputs,
			directivesForAgent,
			skillContents
		);
		const taskSystemPrompt =
			"You are an expert execution agent. Produce practical markdown output for the assigned task.";
		let streamedBuffer = "";
		let output = "";

		const flushBufferedUpdate = () => {
			const chunk = streamedBuffer.trim();
			if (!chunk) {
				streamedBuffer = "";
				return;
			}

			agent.updatedAt = toIsoDate();
			broadcastEvent(
				run,
				buildSseEvent("agent.update", {
					runId: run.id,
					update: buildAgentExecutionUpdate(task, agent, "working", `${chunk}\n`),
				})
			);
			streamedBuffer = "";
		};

		try {
			output = await callGatewayForMarkdown({
				prompt: taskPrompt,
				conversationHistory: run.conversationContext,
				contextDescription: `Plan title: ${run.plan.title}`,
				customSystemPrompt: taskSystemPrompt,
				userName: agent.agentName,
				conflictPolicy: "wait-for-turn",
			});
			flushBufferedUpdate();

			task.status = "done";
			task.completedAt = toIsoDate();
			task.output = output;
			task.outputSummary = toTaskSummaryText(task);
			if (!isAgentBusy(run, agent.agentId)) {
				agent.status = "idle";
				agent.currentTaskId = null;
				agent.currentTaskLabel = null;
			}
			agent.updatedAt = toIsoDate();
			updateRunTimestamp(run);

			emitRunStateEvent(run, "task.completed", {
				taskId: task.id,
				update: buildAgentExecutionUpdate(task, agent, "completed", task.outputSummary),
			});
			await persistIntermediateSnapshot(run);
		} catch (error) {
			flushBufferedUpdate();
			task.status = "failed";
			task.completedAt = toIsoDate();
			task.error = error instanceof Error ? error.message : String(error);
			if (!isAgentBusy(run, agent.agentId)) {
				agent.status = "failed";
				agent.currentTaskId = null;
				agent.currentTaskLabel = null;
			}
			agent.updatedAt = toIsoDate();
			updateRunTimestamp(run);

			emitRunStateEvent(run, "task.failed", {
				taskId: task.id,
				error: task.error,
				update: buildAgentExecutionUpdate(task, agent, "failed", task.error),
			});
			await persistIntermediateSnapshot(run);
			throw error;
		}
	};

		const executeTaskWithRetry = async (run, task) => {
			const maxAttempts = 2;
			for (let attempt = 1; attempt <= maxAttempts; attempt++) {
				try {
					await runTask(run, task);
					return;
				} catch {
					if (attempt >= maxAttempts) {
						return;
					}

					await delay(600 * attempt);
					task.status = "todo";
					task.error = null;
					task.output = null;
					task.outputSummary = null;
					const agent = getAgentByTask(run, task);
					if (agent) {
						agent.status = "idle";
						agent.updatedAt = toIsoDate();
					}
					updateRunTimestamp(run);
					emitRunStateEvent(run, "task.retrying", {
						taskId: task.id,
						attempt: attempt + 1,
					});
				}
			}
		};

		const synthesizeVisualSummary = async (run, summaryContent) => {
			const visualAgentName = "Visual Presenter";
			const configuredVisualAgent = findConfiguredAgentByName(visualAgentName);
			const skillContents = resolveSkillContentsForAgentName(visualAgentName);
			const visualSystemPrompt =
				getNonEmptyString(configuredVisualAgent?.systemPrompt) ||
				"You are a frontend design specialist. Build polished, accessible HTML pages.";
			const visualPrompt = createVisualSummaryPrompt(run, summaryContent, skillContents);
			const partial = run.status === RUN_STATUS_FAILED;

			try {
				const rawHtml = await callGatewayForMarkdown({
					prompt: visualPrompt,
					conversationHistory: [],
					contextDescription: `Visual summary synthesis for run ${run.id}`,
					customSystemPrompt: visualSystemPrompt,
					userName: visualAgentName,
					conflictPolicy: "wait-for-turn",
				});
				run.visualSummary = {
					html: ensureHtmlDocument(rawHtml, `${run.plan.title} visual summary`),
					partial,
					createdAt: toIsoDate(),
					agentName: visualAgentName,
					status: "ready",
				};
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Failed to generate visual summary.";
				logger.warn?.("[AGENTS-RUN] Visual summary synthesis failed; using fallback", error);
				run.visualSummary = {
					html: createFallbackVisualSummaryHtml(run, summaryContent),
					partial,
					createdAt: toIsoDate(),
					agentName: visualAgentName,
					status: "failed",
					error: errorMessage,
				};
			}
		};

		const synthesizeGenuiSummary = async (run, summaryContent) => {
			const partial = run.status === RUN_STATUS_FAILED;
			const genuiPrompt = createGenuiSummaryPrompt(run, summaryContent);
			const genuiSystemPrompt = getGenuiSummarySystemPrompt();

			try {
				const rawText = await callGatewayForMarkdown({
					prompt: genuiPrompt,
					conversationHistory: [],
					contextDescription: `Interactive genui summary for run ${run.id}`,
					customSystemPrompt: genuiSystemPrompt,
					userName: "GenUI Presenter",
					conflictPolicy: "wait-for-turn",
				});

				const analysis = analyzeGeneratedText(rawText);
				const bestSpec = pickBestSpec(analysis);

				if (bestSpec) {
					run.genuiSummary = {
						spec: bestSpec,
						partial,
						createdAt: toIsoDate(),
						status: "ready",
					};
				} else {
					logger.warn?.("[AGENTS-RUN] GenUI summary spec was not renderable; skipping");
					run.genuiSummary = {
						spec: { root: "", elements: {} },
						partial,
						createdAt: toIsoDate(),
						status: "failed",
						error: "Generated spec was not renderable.",
					};
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Failed to generate interactive summary.";
				logger.warn?.("[AGENTS-RUN] GenUI summary synthesis failed", error);
				run.genuiSummary = {
					spec: { root: "", elements: {} },
					partial,
					createdAt: toIsoDate(),
					status: "failed",
					error: errorMessage,
				};
			}
		};

		const synthesizeRunSummary = async (run) => {
			const summaryPrompt = createSummaryPrompt(run);
			let summaryContent = "";
			try {
				summaryContent = await callGatewayForMarkdown({
					prompt: summaryPrompt,
					conversationHistory: [],
					contextDescription: `Final synthesis for run ${run.id}`,
					customSystemPrompt:
						"You combine multi-agent outputs into one cohesive, user-facing report.",
					userName: "Synthesis Agent",
					conflictPolicy: "wait-for-turn",
				});
			} catch (error) {
				logger.warn?.("[AGENTS-RUN] Summary synthesis failed; using fallback", error);
				summaryContent = createFallbackSummary(run);
			}

			run.summary = {
				content: summaryContent,
				partial: run.status === RUN_STATUS_FAILED,
				createdAt: toIsoDate(),
			};

			await Promise.all([
				synthesizeVisualSummary(run, summaryContent),
				synthesizeGenuiSummary(run, summaryContent),
			]);
			updateRunTimestamp(run);
			try {
				await persistRunSnapshot(run);
			} catch (error) {
				logger.error?.("[AGENTS-RUN] Failed to persist run summary snapshot", error);
			}
			emitRunStateEvent(run, "run.summary-ready", {});
		};

	const finalizeRun = async (run) => {
		const regularFailedTasks = run.tasks.filter(
			(task) => FAILURE_TASK_STATUSES.has(task.status)
		);
		run.status = regularFailedTasks.length > 0 ? RUN_STATUS_FAILED : RUN_STATUS_COMPLETED;
		run.completedAt = toIsoDate();
		updateRunTimestamp(run);

		try {
			await persistRunSnapshot(run);
		} catch (error) {
			logger.error?.("[AGENTS-RUN] Failed to persist finalized run snapshot", error);
		}

		if (run.status === RUN_STATUS_COMPLETED) {
			emitRunStateEvent(run, "run.completed", {});
		} else {
			emitRunStateEvent(run, "run.failed", {
				error: regularFailedTasks.length > 0 ? "One or more tasks failed." : "Run failed.",
			});
		}

		void synthesizeRunSummary(run).catch((error) => {
			logger.error?.("[AGENTS-RUN] Failed to generate run summary", error);
		});
	};

	const scheduleRun = async (run) => {
		const activeTaskPromises = new Map();

		const launchReadyTasks = () => {
			markBlockedTasksWithFailedDependencies(run);

			for (const task of run.tasks) {
				if (task.status !== "todo") {
					continue;
				}

				const dependenciesResolved = task.blockedBy.every((dependencyId) => {
					const dependencyTask = run.tasks.find((item) => item.id === dependencyId);
					if (!dependencyTask) {
						return true;
					}
					return dependencyTask.status === "done";
				});
				if (!dependenciesResolved) {
					continue;
				}

				const taskPromise = executeTaskWithRetry(run, task)
					.catch((error) => {
						logger.error?.("[AGENTS-RUN] Task execution failed", error);
					})
					.finally(() => {
						activeTaskPromises.delete(task.id);
					});
				activeTaskPromises.set(task.id, taskPromise);
			}
		};

		while (true) {
			launchReadyTasks();
			if (activeTaskPromises.size === 0) {
				const remainingTask = run.tasks.find(
					(task) => !TERMINAL_TASK_STATUSES.has(task.status)
				);
				if (!remainingTask) {
					break;
				}

				const anyBlockedChanged = markBlockedTasksWithFailedDependencies(run);
				if (!anyBlockedChanged) {
					remainingTask.status = "blocked-failed";
					remainingTask.error = "Task could not be scheduled due to unresolved dependencies.";
					remainingTask.completedAt = toIsoDate();
					updateRunTimestamp(run);
					emitRunStateEvent(run, "task.blocked", { taskId: remainingTask.id });
				}
				continue;
			}

			await Promise.race(activeTaskPromises.values());
		}

		await finalizeRun(run);
	};

	const loadRunFromDisk = async (runId) => {
		const paths = buildRunPaths(runRootsDir, runId);
		try {
			const rawRun = await fs.readFile(paths.runFilePath, "utf8");
			const parsedRun = safeJsonParse(rawRun);
			if (!parsedRun || typeof parsedRun !== "object") {
				return null;
			}
			return parsedRun;
		} catch {
			return null;
		}
	};

	const createRun = async ({
		plan,
		userPrompt,
		conversation,
		customInstruction,
	}) => {
		const normalizedPlan = normalizePlan(plan);
		if (!normalizedPlan) {
			throw new Error("A valid plan with tasks is required.");
		}

		const runId = createId("run");
		const run = createInitialRun({
			runId,
			plan: normalizedPlan,
			userPrompt: getNonEmptyString(userPrompt) || "",
			conversationContext: buildConversationContext(conversation),
			customInstruction: getNonEmptyString(customInstruction) || undefined,
		});
		runsById.set(runId, run);
		await persistIntermediateSnapshot(run);
		emitRunStateEvent(run, "run.started", {});

		void scheduleRun(run).catch(async (error) => {
			logger.error?.("[AGENTS-RUN] Run scheduler crashed", error);
			run.status = RUN_STATUS_FAILED;
			run.error = error instanceof Error ? error.message : String(error);
			run.completedAt = toIsoDate();
			updateRunTimestamp(run);
			await persistRunSnapshot(run);
			emitRunStateEvent(run, "run.failed", { error: run.error });
		});

		return toSerializableRun(run);
	};

	const getRun = async (runId) => {
		const activeRun = runsById.get(runId);
		if (activeRun) {
			return toSerializableRun(activeRun);
		}

		return loadRunFromDisk(runId);
	};

	const readRunSummaryArtifacts = async (runId, diskRun) => {
		const paths = buildRunPaths(runRootsDir, runId);
		const [rawSummary, rawVisualSummary, rawGenuiSummary] = await Promise.all([
			fs.readFile(paths.summaryJsonPath, "utf8").catch(() => null),
			fs.readFile(paths.visualSummaryJsonPath, "utf8").catch(() => null),
			fs.readFile(paths.genuiSummaryJsonPath, "utf8").catch(() => null),
		]);
		const parsedSummary = typeof rawSummary === "string" ? safeJsonParse(rawSummary) : null;
		const parsedVisualSummary =
			typeof rawVisualSummary === "string" ? safeJsonParse(rawVisualSummary) : null;
		const parsedGenuiSummary =
			typeof rawGenuiSummary === "string" ? safeJsonParse(rawGenuiSummary) : null;

		return {
			run: diskRun,
			summary: parsedSummary || diskRun.summary || null,
			visualSummary: parsedVisualSummary || diskRun.visualSummary || null,
			genuiSummary: parsedGenuiSummary || diskRun.genuiSummary || null,
		};
	};

	const getRunSummary = async (runId) => {
		const activeRun = runsById.get(runId);
		if (activeRun) {
			return {
				run: toSerializableRun(activeRun),
				summary: activeRun.summary ?? null,
				visualSummary: activeRun.visualSummary ?? null,
				genuiSummary: activeRun.genuiSummary ?? null,
			};
		}

		const diskRun = await loadRunFromDisk(runId);
		if (!diskRun) {
			return null;
		}

		return readRunSummaryArtifacts(runId, diskRun);
	};

	const getRunVisualSummary = async (runId) => {
		const activeRun = runsById.get(runId);
		if (activeRun) {
			return {
				run: toSerializableRun(activeRun),
				visualSummary: activeRun.visualSummary ?? null,
			};
		}

		const diskRun = await loadRunFromDisk(runId);
		if (!diskRun) {
			return null;
		}

		const summaryPayload = await readRunSummaryArtifacts(runId, diskRun);
		return {
			run: summaryPayload.run,
			visualSummary: summaryPayload.visualSummary,
		};
	};

	const addDirective = async (runId, { agentName, message }) => {
		const run = runsById.get(runId);
		if (!run) {
			return { error: "Run not found or not active." };
		}
		if (run.status !== RUN_STATUS_RUNNING) {
			return { error: "Run is not active." };
		}

		const normalizedAgentName = getNonEmptyString(agentName);
		const normalizedMessage = getNonEmptyString(message);
		if (!normalizedAgentName || !normalizedMessage) {
			return { error: "Agent name and message are required." };
		}

		const agent =
			run.agents.find(
				(item) => item.agentName.toLowerCase() === normalizedAgentName.toLowerCase()
			) || null;
		if (!agent) {
			return { error: `Agent ${normalizedAgentName} was not found in this run.` };
		}

		const directive = {
			id: createId("directive"),
			agentId: agent.agentId,
			agentName: agent.agentName,
			message: normalizedMessage,
			createdAt: toIsoDate(),
		};
		run.directives.push(directive);
		updateRunTimestamp(run);
		await persistIntermediateSnapshot(run);
		emitRunStateEvent(run, "directive.recorded", {
			directive,
			update:
				agent.currentTaskId && agent.currentTaskLabel
					? {
						agentId: agent.agentId,
						agentName: agent.agentName,
						taskId: agent.currentTaskId,
						taskLabel: agent.currentTaskLabel,
						status: "working",
						content: `Received directive: ${normalizedMessage}`,
					}
					: null,
		});

		return {
			run: toSerializableRun(run),
			directive,
		};
	};

	const streamRunEvents = async (req, res, runId) => {
		const run = runsById.get(runId);
		if (!run) {
			const diskRun = await loadRunFromDisk(runId);
			if (!diskRun) {
				res.status(404).json({ error: "Run not found" });
				return;
			}

			res.setHeader("Content-Type", "text/event-stream");
			res.setHeader("Cache-Control", "no-cache");
			res.setHeader("Connection", "keep-alive");
			res.write(`data: ${JSON.stringify(buildSseEvent("snapshot", { run: diskRun }))}\n\n`);
			res.end();
			return;
		}

		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");
		res.flushHeaders?.();

		res.write(
			`data: ${JSON.stringify(
				buildSseEvent("snapshot", { run: toSerializableRun(run) })
			)}\n\n`
		);

		run.subscribers.add(res);

		const keepAliveId = setInterval(() => {
			res.write(`: ping ${Date.now()}\n\n`);
		}, 15000);

		req.on("close", () => {
			clearInterval(keepAliveId);
			run.subscribers.delete(res);
		});
	};

	return {
		createRun,
		getRun,
		getRunSummary,
		getRunVisualSummary,
		addDirective,
		streamRunEvents,
	};
}

module.exports = {
	createRunManager,
};
