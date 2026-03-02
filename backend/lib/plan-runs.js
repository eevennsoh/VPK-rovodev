const fs = require("node:fs/promises");
const path = require("node:path");
const {
	streamViaRovoDev,
	generateTextViaRovoDev,
	WAIT_FOR_TURN_TIMEOUT_MS,
} = require("./rovodev-gateway");
const { createAIGatewayProvider } = require("./ai-gateway-provider");
const {
	getEnvVars,
	detectEndpointType,
	resolveGatewayUrl,
} = require("./ai-gateway-helpers");
const { synthesizeSound } = require("./sound-generation");
const { getGenuiSummarySystemPrompt } = require("./genui-system-prompt");
const { analyzeGeneratedText, pickBestSpec } = require("./genui-spec-utils");
const { inferTaskDependencies, isLinearChain } = require("./dag-inference");

const TERMINAL_TASK_STATUSES = new Set(["done", "failed", "blocked-failed"]);
const FAILURE_TASK_STATUSES = new Set(["failed", "blocked-failed"]);
const RUN_STATUS_RUNNING = "running";
const RUN_STATUS_COMPLETED = "completed";
const RUN_STATUS_FAILED = "failed";
const DEFAULT_MAX_CONCURRENT_AGENTS =
	getPositiveInteger(process.env.ROVODEV_POOL_SIZE) || 6;
const MAX_RUN_LIST_LIMIT = 50;
const STREAMING_UPDATE_CHUNK_SIZE = 120;
const STREAMING_UPDATE_MAX_CONTENT_CHARS = 8000;
const STREAMING_UPDATE_FLUSH_MS = 1000;
const VISUAL_PRESENTER_AGENT_NAME = "Visual Presenter";
const GENUI_WIDGET_COUNT = 4;
const GENUI_WIDGET_BLUEPRINTS = [
	{
		id: "interactive-widget-1",
		title: "Interactive widget 1",
		focus:
			"Summarize execution outcomes with key metrics such as completion count, failure count, and success rate.",
	},
	{
		id: "interactive-widget-2",
		title: "Interactive widget 2",
		focus:
			"Show a task-level status breakdown with clear status labels and a view that helps inspect progress by task.",
	},
	{
		id: "interactive-widget-3",
		title: "Interactive widget 3",
		focus:
			"Visualize execution flow by agent or dependency handoffs so users can understand how work moved across tasks.",
	},
	{
		id: "interactive-widget-4",
		title: "Interactive widget 4",
		focus:
			"Present recommended next actions with prioritization and ownership so users can continue from this run.",
	},
];

const ARTIFACT_TYPE_SUMMARY = "summary-md";
const ARTIFACT_TYPE_VISUAL = "visual-html";
const ARTIFACT_TYPE_GENUI = "genui-json";
const ARTIFACT_TYPE_AUDIO = "audio";
const ARTIFACT_TYPE_TASK_OUTPUT = "task-output";
const ARTIFACT_TYPE_LINK = "link";

function getNonEmptyString(value) {
	if (typeof value !== "string") {
		return null;
	}

	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : null;
}

function getPositiveInteger(value) {
	if (typeof value === "number" && Number.isInteger(value) && value > 0) {
		return value;
	}

	if (typeof value === "string") {
		const parsedValue = Number.parseInt(value, 10);
		if (Number.isInteger(parsedValue) && parsedValue > 0) {
			return parsedValue;
		}
	}

	return null;
}

function getAIGatewayDiagnostics(preferredProvider) {
	const envVars = getEnvVars();
	const normalizedProvider =
		typeof preferredProvider === "string" ? preferredProvider.trim().toLowerCase() : null;
	const rawGatewayUrl =
		normalizedProvider === "google"
			? envVars.AI_GATEWAY_URL_GOOGLE || envVars.AI_GATEWAY_URL
			: envVars.AI_GATEWAY_URL || envVars.AI_GATEWAY_URL_GOOGLE;
	const resolvedGatewayUrl = rawGatewayUrl
		? resolveGatewayUrl(rawGatewayUrl) || rawGatewayUrl
		: null;
	const endpointType = resolvedGatewayUrl
		? detectEndpointType(resolvedGatewayUrl)
		: null;

	return {
		provider: normalizedProvider || "default",
		endpointType: endpointType || "unknown",
		config: {
			AI_GATEWAY_URL: envVars.AI_GATEWAY_URL ? "SET" : "MISSING",
			AI_GATEWAY_URL_GOOGLE: envVars.AI_GATEWAY_URL_GOOGLE ? "SET" : "MISSING",
			AI_GATEWAY_USE_CASE_ID: envVars.AI_GATEWAY_USE_CASE_ID ? "SET" : "MISSING",
			AI_GATEWAY_CLOUD_ID: envVars.AI_GATEWAY_CLOUD_ID ? "SET" : "MISSING",
			AI_GATEWAY_USER_ID: envVars.AI_GATEWAY_USER_ID ? "SET" : "MISSING",
			ASAP_ISSUER: process.env.ASAP_ISSUER ? "SET" : "MISSING",
			ASAP_KID: process.env.ASAP_KID ? "SET" : "MISSING",
			ASAP_PRIVATE_KEY: process.env.ASAP_PRIVATE_KEY ? "SET" : "MISSING",
		},
	};
}

function formatAIGatewayDiagnostics(diagnostics) {
	return (
		`[AI Gateway diagnostics] provider=${diagnostics.provider}; ` +
		`endpointType=${diagnostics.endpointType}; ` +
		`AI_GATEWAY_URL=${diagnostics.config.AI_GATEWAY_URL}; ` +
		`AI_GATEWAY_URL_GOOGLE=${diagnostics.config.AI_GATEWAY_URL_GOOGLE}; ` +
		`AI_GATEWAY_USE_CASE_ID=${diagnostics.config.AI_GATEWAY_USE_CASE_ID}; ` +
		`AI_GATEWAY_CLOUD_ID=${diagnostics.config.AI_GATEWAY_CLOUD_ID}; ` +
		`AI_GATEWAY_USER_ID=${diagnostics.config.AI_GATEWAY_USER_ID}; ` +
		`ASAP_ISSUER=${diagnostics.config.ASAP_ISSUER}; ` +
		`ASAP_KID=${diagnostics.config.ASAP_KID}; ` +
		`ASAP_PRIVATE_KEY=${diagnostics.config.ASAP_PRIVATE_KEY}`
	);
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

function getTimestampFromIsoString(value) {
	if (typeof value !== "string" || !value.trim()) {
		return Number.NaN;
	}

	return Date.parse(value);
}

function parseJsonObjectFromText(rawText) {
	if (typeof rawText !== "string") {
		return null;
	}

	const trimmedText = rawText.trim();
	if (!trimmedText) {
		return null;
	}

	const parsed = safeJsonParse(trimmedText);
	if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
		return parsed;
	}

	const objectMatch = trimmedText.match(/\{[\s\S]*\}/);
	if (!objectMatch) {
		return null;
	}

	const objectPayload = safeJsonParse(objectMatch[0]);
	if (!objectPayload || typeof objectPayload !== "object" || Array.isArray(objectPayload)) {
		return null;
	}

	return objectPayload;
}

function normalizeTaskArray(rawTasks, existingTaskIds = new Set()) {
	if (!Array.isArray(rawTasks)) {
		return [];
	}

	const seenTaskIds = new Set(existingTaskIds);
	const seenRawTaskIds = new Map();
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

			const fallbackTaskId = `task-${index + 1}`;
			const providedTaskId = getNonEmptyString(taskRecord.id) || fallbackTaskId;
			let taskId = providedTaskId;
			let duplicateIndex = 2;
			while (seenTaskIds.has(taskId)) {
				taskId = `${providedTaskId}-${duplicateIndex}`;
				duplicateIndex += 1;
			}
			seenTaskIds.add(taskId);
			seenRawTaskIds.set(providedTaskId, taskId);

			const agentName = getNonEmptyString(taskRecord.agent) || "Rovo";
			const agentId = slugifyAgentName(agentName);
			const rawBlockedBy = Array.isArray(taskRecord.blockedBy)
				? taskRecord.blockedBy
						.map((dependencyId) => getNonEmptyString(dependencyId))
						.filter(Boolean)
				: [];

			return {
				id: taskId,
				label,
				agentName,
				agentId,
				rawBlockedBy,
			};
		})
		.filter(Boolean);

	const newTaskIds = new Set(provisionalTasks.map((task) => task.id));
	return provisionalTasks.map((task) => {
		const blockedBy = task.rawBlockedBy
			.map((dependencyId) => seenRawTaskIds.get(dependencyId) || dependencyId)
			.filter(
				(dependencyId) =>
					dependencyId !== task.id &&
					(newTaskIds.has(dependencyId) || existingTaskIds.has(dependencyId))
			);

		return {
			id: task.id,
			label: task.label,
			agentName: task.agentName,
			agentId: task.agentId,
			blockedBy,
		};
	});
}

function normalizeTaskIdArray(rawTaskIds) {
	if (!Array.isArray(rawTaskIds)) {
		return [];
	}

	const normalizedTaskIds = [];
	const seenTaskIds = new Set();
	for (const rawTaskId of rawTaskIds) {
		const taskId = getNonEmptyString(rawTaskId);
		if (!taskId || seenTaskIds.has(taskId)) {
			continue;
		}

		seenTaskIds.add(taskId);
		normalizedTaskIds.push(taskId);
	}

	return normalizedTaskIds;
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
	const tasks = normalizeTaskArray(planRecord.tasks, new Set());
	if (tasks.length === 0) {
		return null;
	}

	const agents = Array.from(new Set(tasks.map((task) => task.agentName))).sort();
	return {
		title,
		description,
		emoji,
		agents,
		tasks,
	};
}

function normalizePlanDelta(rawPlanDelta, existingTaskIds) {
	if (!rawPlanDelta || typeof rawPlanDelta !== "object") {
		return null;
	}

	const planDeltaRecord = rawPlanDelta;
	const tasks = normalizeTaskArray(planDeltaRecord.tasks, existingTaskIds);
	if (tasks.length === 0) {
		return null;
	}

	const title = getNonEmptyString(planDeltaRecord.title) || undefined;
	const description = getNonEmptyString(planDeltaRecord.description) || undefined;
	const emoji = getNonEmptyString(planDeltaRecord.emoji) || undefined;
	const agents = Array.from(new Set(tasks.map((task) => task.agentName))).sort();

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
		audioSummaryJsonPath: path.join(runDir, "audio-summary.json"),
		audioSummaryPath: path.join(runDir, "audio-summary.mp3"),
		artifactsManifestPath: path.join(runDir, "artifacts.json"),
		agentsDir: path.join(runDir, "agents"),
		tasksDir: path.join(runDir, "tasks"),
	};
}

function normalizeArtifacts(rawArtifacts) {
	if (!Array.isArray(rawArtifacts)) {
		return [];
	}

	return rawArtifacts
		.map((artifact) => {
			if (!artifact || typeof artifact !== "object") {
				return null;
			}

			const id = getNonEmptyString(artifact.id);
			const type = getNonEmptyString(artifact.type);
			const title = getNonEmptyString(artifact.title);
			const createdAt = getNonEmptyString(artifact.createdAt);
			if (!id || !type || !title || !createdAt) {
				return null;
			}

			return {
				id,
				type,
				title,
				path: getNonEmptyString(artifact.path) || undefined,
				url: getNonEmptyString(artifact.url) || undefined,
				mimeType: getNonEmptyString(artifact.mimeType) || undefined,
				sizeBytes:
					typeof artifact.sizeBytes === "number" && artifact.sizeBytes >= 0
						? artifact.sizeBytes
						: undefined,
				createdAt,
				iteration: getPositiveInteger(artifact.iteration) || 1,
				taskId: getNonEmptyString(artifact.taskId) || undefined,
			};
		})
		.filter(Boolean);
}

function createEmptyGenuiSpec() {
	return {
		root: "",
		elements: {},
	};
}

function normalizeGenuiSpec(rawSpec) {
	if (!rawSpec || typeof rawSpec !== "object" || Array.isArray(rawSpec)) {
		return createEmptyGenuiSpec();
	}

	const normalizedSpec = {
		root: typeof rawSpec.root === "string" ? rawSpec.root : "",
		elements:
			rawSpec.elements &&
			typeof rawSpec.elements === "object" &&
			!Array.isArray(rawSpec.elements)
				? rawSpec.elements
				: {},
	};

	if (
		Object.prototype.hasOwnProperty.call(rawSpec, "state") &&
		rawSpec.state !== undefined
	) {
		normalizedSpec.state = rawSpec.state;
	}

	return normalizedSpec;
}

function hasRenderableGenuiSpec(spec) {
	if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
		return false;
	}

	const root = typeof spec.root === "string" ? spec.root.trim() : "";
	if (!root) {
		return false;
	}

	const elements =
		spec.elements &&
		typeof spec.elements === "object" &&
		!Array.isArray(spec.elements)
			? spec.elements
			: null;
	return Boolean(elements && Object.keys(elements).length > 0);
}

function createDefaultGenuiWidget(index, createdAt) {
	return {
		id: `interactive-widget-${index + 1}`,
		title: `Interactive widget ${index + 1}`,
		spec: createEmptyGenuiSpec(),
		status: "failed",
		createdAt,
		error: "Widget content is not available yet.",
	};
}

function normalizeGenuiWidget(rawWidget, index, fallbackCreatedAt) {
	const fallbackWidget = createDefaultGenuiWidget(index, fallbackCreatedAt);
	if (!rawWidget || typeof rawWidget !== "object" || Array.isArray(rawWidget)) {
		return fallbackWidget;
	}

	const spec = normalizeGenuiSpec(rawWidget.spec);
	const isRenderable = hasRenderableGenuiSpec(spec);
	const status =
		rawWidget.status === "ready" && isRenderable
			? "ready"
			: rawWidget.status === "failed" || !isRenderable
				? "failed"
				: "ready";

	const error =
		getNonEmptyString(rawWidget.error) ||
		(status === "failed" ? "Failed to generate interactive widget." : undefined);

	return {
		id: getNonEmptyString(rawWidget.id) || fallbackWidget.id,
		title: getNonEmptyString(rawWidget.title) || fallbackWidget.title,
		spec,
		status,
		createdAt: getNonEmptyString(rawWidget.createdAt) || fallbackCreatedAt,
		error,
	};
}

function normalizeGenuiSummary(rawGenuiSummary) {
	if (!rawGenuiSummary || typeof rawGenuiSummary !== "object") {
		return null;
	}

	const createdAt = getNonEmptyString(rawGenuiSummary.createdAt) || toIsoDate();
	const widgets = Array.isArray(rawGenuiSummary.widgets)
		? rawGenuiSummary.widgets
				.slice(0, GENUI_WIDGET_COUNT)
				.map((rawWidget, index) => normalizeGenuiWidget(rawWidget, index, createdAt))
		: [];
	const legacySpec = normalizeGenuiSpec(rawGenuiSummary.spec);
	const hasRenderableLegacySpec = hasRenderableGenuiSpec(legacySpec);

	if (widgets.length === 0) {
		const legacyStatus =
			rawGenuiSummary.status === "ready" && hasRenderableLegacySpec
				? "ready"
				: rawGenuiSummary.status === "failed" || !hasRenderableLegacySpec
					? "failed"
					: "ready";
		widgets.push({
			id: "interactive-widget-1",
			title: "Interactive widget 1",
			spec: legacySpec,
			status: legacyStatus,
			createdAt,
			error:
				getNonEmptyString(rawGenuiSummary.error) ||
				(legacyStatus === "failed"
					? "Failed to generate interactive summary."
					: undefined),
		});
	}

	const readyWidgetCount = widgets.filter(
		(widget) => widget.status === "ready" && hasRenderableGenuiSpec(widget.spec)
	).length;
	const status = readyWidgetCount > 0 ? "ready" : "failed";
	const summaryError =
		getNonEmptyString(rawGenuiSummary.error) ||
		(status === "failed" ? "Failed to generate interactive summary widgets." : undefined);
	const representativeSpec =
		widgets.find((widget) => widget.status === "ready")?.spec ||
		(hasRenderableLegacySpec ? legacySpec : createEmptyGenuiSpec());

	return {
		widgets,
		spec: representativeSpec,
		partial: Boolean(rawGenuiSummary.partial),
		createdAt,
		status,
		error: summaryError,
	};
}

function ensureRunDefaults(rawRun) {
	if (!rawRun || typeof rawRun !== "object") {
		return null;
	}

	const runId = getNonEmptyString(rawRun.runId) || getNonEmptyString(rawRun.id);
	if (!runId) {
		return null;
	}

	const status =
		rawRun.status === RUN_STATUS_COMPLETED || rawRun.status === RUN_STATUS_FAILED
			? rawRun.status
			: RUN_STATUS_RUNNING;
	const createdAt = getNonEmptyString(rawRun.createdAt) || toIsoDate();
	const updatedAt = getNonEmptyString(rawRun.updatedAt) || createdAt;
	const completedAt = getNonEmptyString(rawRun.completedAt);
	const iteration = getPositiveInteger(rawRun.iteration) || 1;
	const plan =
		rawRun.plan && typeof rawRun.plan === "object"
			? rawRun.plan
			: {
				title: "Execution plan",
				description: undefined,
				emoji: undefined,
				agents: [],
				tasks: [],
			};
	const tasks = Array.isArray(rawRun.tasks)
		? rawRun.tasks.map((task) => ({
				...task,
				iteration: getPositiveInteger(task.iteration) || 1,
				batchId: getNonEmptyString(task.batchId) || null,
		  }))
		: [];
	const agents = Array.isArray(rawRun.agents) ? rawRun.agents : [];
	const directives = Array.isArray(rawRun.directives) ? rawRun.directives : [];

	return {
		id: runId,
		status,
		error: getNonEmptyString(rawRun.error),
		createdAt,
		updatedAt,
		completedAt,
		plan,
		tasks,
		agents,
		directives,
		summary: rawRun.summary || null,
		visualSummary: rawRun.visualSummary || null,
		genuiSummary: normalizeGenuiSummary(rawRun.genuiSummary),
		userPrompt: getNonEmptyString(rawRun.userPrompt) || "",
		customInstruction: getNonEmptyString(rawRun.customInstruction) || undefined,
		conversationContext: buildConversationContext(rawRun.conversationContext),
		iteration,
		artifacts: normalizeArtifacts(rawRun.artifacts),
		activeBatchId: getNonEmptyString(rawRun.activeBatchId) || null,
		events: [],
		subscribers: new Set(),
		schedulerPromise: null,
	};
}

function createInitialRun({ runId, plan, userPrompt, conversationContext, customInstruction }) {
	const now = toIsoDate();
	const batchId = createId("batch");
	const iteration = 1;
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
		iteration,
		batchId,
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
		iteration,
		artifacts: [],
		activeBatchId: batchId,
		events: [],
		subscribers: new Set(),
		schedulerPromise: null,
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
		genuiSummary: normalizeGenuiSummary(run.genuiSummary),
		userPrompt: run.userPrompt,
		customInstruction: run.customInstruction,
		conversationContext: run.conversationContext,
		iteration: run.iteration,
		artifacts: run.artifacts,
		activeBatchId: run.activeBatchId,
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
					.map((item) => `- ${item.taskId}: ${item.taskLabel}\n${item.output}`)
					.join("\n\n")
			: "- None";
	const directivesSection =
		directivesForAgent.length > 0
			? directivesForAgent.map((directive) => `- ${directive.message}`).join("\n")
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

function createSummaryPrompt(run, tasksForSummary, isFailedStatus) {
	const taskSections = tasksForSummary
		.map((task) => {
			const taskOutput = task.output?.trim() || task.error || "No output generated.";
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
		`Synthesize a final report for the plan \"${run.plan.title}\".`,
		run.plan.description ? `Plan description: ${run.plan.description}` : null,
		isFailedStatus
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

function createFallbackSummary(run, tasksForSummary, isFailedStatus) {
	const lines = [
		`# ${run.plan.title}`,
		run.plan.description ? `${run.plan.description}\n` : null,
		"## Executive summary",
		isFailedStatus
			? "Execution finished with partial completion due to failed or blocked tasks."
			: "Execution completed successfully across all planned tasks.",
		"",
		"## Task outcomes",
		...tasksForSummary.map(
			(task) =>
				`### ${task.id} · ${task.label} (${task.agentName})\nStatus: ${task.status}\n\n${task.output || task.error || "No output generated."}`
		),
	];

	return lines.filter(Boolean).join("\n\n");
}

function createVisualSummaryPrompt(run, summaryContent, tasksForSummary, skillContents, isFailedStatus) {
	const taskSections = tasksForSummary
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
		`Create a polished, user-facing HTML summary page for the plan \"${run.plan.title}\".`,
		run.plan.description ? `Plan description: ${run.plan.description}` : null,
		isFailedStatus
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

function createGenuiSummaryPrompt(
	run,
	summaryContent,
	tasksForSummary,
	isFailedStatus,
	widgetBlueprint
) {
	const taskSections = tasksForSummary
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
		`Create one focused interactive summary widget for the plan \"${run.plan.title}\".`,
		run.plan.description ? `Plan description: ${run.plan.description}` : null,
		isFailedStatus
			? "This run has partial completion due to failed or blocked tasks."
			: "This run completed successfully.",
		"",
		`Widget focus: ${widgetBlueprint.focus}`,
		"Produce exactly one interactive widget experience (not a full-page dashboard).",
		"The generated spec should be compact, focused, and directly useful for interaction.",
		"Do not use generic labels such as 'Interactive widget 1' in headings or labels.",
		"Use the task outcomes and markdown summary below as source material.",
		"Output exactly one ```spec block with valid RFC 6902 JSON patch lines.",
		"",
		`Widget ID: ${widgetBlueprint.id}`,
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

function createAppendTasksPrompt(run, prompt, contextPrompt) {
	const taskContext = run.tasks
		.map((task) => `${task.id} | ${task.label} | status=${task.status}`)
		.join("\n");

	return [
		"You are planning additional tasks for an in-progress multi-agent run.",
		"Return ONLY strict JSON. No markdown fences or commentary.",
		"",
		"JSON schema:",
		"{",
		'  "title": "optional string",',
		'  "description": "optional string",',
		'  "tasks": [',
		"    {",
		'      "id": "short-id",',
		'      "label": "task description",',
		'      "agent": "agent name",',
		'      "blockedBy": ["optional dependency id"]',
		"    }",
		"  ]",
		"}",
		"",
		"Rules:",
		"- Create 1-4 concrete tasks based on the user's new request.",
		"- blockedBy may reference existing task IDs or new task IDs from this response.",
		"- Use blockedBy ONLY for genuine data dependencies where one task requires another's output.",
		"- Tasks working on different aspects MUST have empty blockedBy arrays so they run in parallel.",
		"- Do NOT create linear chains unless each task truly requires the prior task's output.",
		"- Keep labels actionable and implementation-focused.",
		"- Prefer existing agents when possible.",
		"",
		`Plan title: ${run.plan.title}`,
		run.plan.description ? `Plan description: ${run.plan.description}` : null,
		"",
		"Existing tasks:",
		taskContext || "- none",
		"",
		contextPrompt ? `Additional context: ${contextPrompt}` : null,
		`User request: ${prompt}`,
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

function createFallbackVisualSummaryHtml(run, summaryContent, isFailedStatus) {
	const statusText = isFailedStatus ? "Partial completion" : "Completed";
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

function extractLinksFromText(rawText) {
	if (typeof rawText !== "string" || !rawText.trim()) {
		return [];
	}

	const matches = rawText.match(/https?:\/\/[^\s<>()\[\]{}"']+/g);
	if (!matches) {
		return [];
	}

	const seen = new Set();
	const links = [];
	for (const match of matches) {
		const normalizedLink = match.replace(/[.,);!?]+$/g, "");
		if (!normalizedLink || seen.has(normalizedLink)) {
			continue;
		}

		seen.add(normalizedLink);
		links.push(normalizedLink);
	}

	return links;
}

function markdownToSpeechText(markdown) {
	if (typeof markdown !== "string") {
		return "";
	}

	return markdown
		.replace(/```[\s\S]*?```/g, " ")
		.replace(/[>#*_`|\-]+/g, " ")
		.replace(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/g, "$1")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 3900);
}

function createRunManager(options) {
	const {
		baseDir,
		buildSystemPrompt,
		configManager,
		logger = console,
		isRovoDevAvailable = async () => false,
		isAIGatewayFallbackEnabled = () => false,
	} = options;
	const persistenceMode = process.env.AGENTS_TEAM_PERSIST_MODE?.trim().toLowerCase() || "final-only";
	const persistIntermediateSnapshots = persistenceMode !== "final-only";
	const maxConcurrentAgents =
		getPositiveInteger(process.env.AGENTS_TEAM_MAX_CONCURRENT) ||
		DEFAULT_MAX_CONCURRENT_AGENTS;
	const runsById = new Map();
	const runRootsDir = path.join(baseDir, "plan-runs");
	const aiGatewayProvider = createAIGatewayProvider({ logger });

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

	const writeTextFile = async (filePath, content) => {
		await fs.mkdir(path.dirname(filePath), { recursive: true });
		await fs.writeFile(filePath, content, "utf8");
	};

	const updateRunTimestamp = (run) => {
		run.updatedAt = toIsoDate();
	};

	const buildArtifactUrl = (runId, artifactId) =>
		`/api/plan/runs/${encodeURIComponent(runId)}/files?id=${encodeURIComponent(artifactId)}`;

	const replaceIterationArtifacts = (run, iteration, nextArtifacts) => {
		run.artifacts = [
			...run.artifacts.filter((artifact) => artifact.iteration !== iteration),
			...nextArtifacts,
		];
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
			await writeTextFile(paths.summaryMarkdownPath, run.summary.content);
		}

		if (run.visualSummary) {
			await writeJsonFile(paths.visualSummaryJsonPath, run.visualSummary);
			await writeTextFile(paths.visualSummaryHtmlPath, run.visualSummary.html);
		}

		if (run.genuiSummary) {
			await writeJsonFile(paths.genuiSummaryJsonPath, run.genuiSummary);
		}

		await writeJsonFile(paths.artifactsManifestPath, run.artifacts || []);
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

	const emitRunStateEvent = (run, type, payload = {}) => {
		broadcastEvent(
			run,
			buildSseEvent(type, {
				run: toSerializableRun(run),
				...payload,
			})
		);
	};

	const emitAgentUpdateEvent = (run, update) => {
		broadcastEvent(
			run,
			buildSseEvent("agent.update", {
				runId: run.id,
				update,
			})
		);
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

	const createSystemPrompt = (userName, customSystemPrompt) => {
		if (getNonEmptyString(customSystemPrompt)) {
			return customSystemPrompt;
		}

		if (buildSystemPrompt) {
			return buildSystemPrompt(userName, null, "ask");
		}

		return "You are a helpful AI assistant.";
	};

	const buildUserMessage = ({ prompt, conversationHistory, contextDescription }) => {
		let userMessage = prompt;
		if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
			const historyText = conversationHistory
				.map((message) => `${message.type === "user" ? "User" : "Assistant"}: ${message.content}`)
				.join("\n");
			userMessage = `Previous conversation context:\n${historyText}\n\nCurrent question: ${prompt}`;
		}

		if (contextDescription) {
			userMessage = `${contextDescription}\n\n${userMessage}`;
		}

		return userMessage;
	};

	const callAIGatewayForMarkdown = async ({
		prompt,
		conversationHistory,
		contextDescription,
		customSystemPrompt,
		userName,
		providerKind,
		onTextDelta,
	}) => {
		const systemPrompt = createSystemPrompt(userName, customSystemPrompt);
		const userMessage = buildUserMessage({
			prompt,
			conversationHistory,
			contextDescription,
		});
		const diagnostics = getAIGatewayDiagnostics(providerKind);

		try {
			const result =
				typeof onTextDelta === "function"
					? await aiGatewayProvider.streamText({
						system: systemPrompt,
						prompt: userMessage,
						maxOutputTokens: 2200,
						temperature: 0.4,
						onTextDelta,
					})
					: await aiGatewayProvider.generateText({
						system: systemPrompt,
						prompt: userMessage,
						maxOutputTokens: 2200,
						temperature: 0.4,
					});
			return result.trim();
		} catch (error) {
			logger.error?.("[AGENTS-RUN] AI Gateway markdown call failed", {
				error: error instanceof Error ? error.message : String(error),
				diagnostics,
			});
			const baseMessage = error instanceof Error ? error.message : String(error);
			throw new Error(`${baseMessage} ${formatAIGatewayDiagnostics(diagnostics)}`);
		}
	};

	const callRovoDevForMarkdown = async ({
		prompt,
		conversationHistory,
		contextDescription,
		customSystemPrompt,
		userName,
		conflictPolicy,
		timeoutMs,
		onTextDelta,
	}) => {
		const systemPrompt = createSystemPrompt(userName, customSystemPrompt);
		const userMessage = buildUserMessage({
			prompt,
			conversationHistory,
			contextDescription,
		});

		const resolvedTimeoutMs =
			typeof timeoutMs === "number" && timeoutMs > 0
				? timeoutMs
				: conflictPolicy === "wait-for-turn"
					? WAIT_FOR_TURN_TIMEOUT_MS
					: undefined;

		if (typeof onTextDelta === "function") {
			let fullResponse = "";
			let fullMessage = "";
			if (systemPrompt) {
				fullMessage += `[System Instructions]\n${systemPrompt}\n[End System Instructions]\n\n`;
			}
			fullMessage += userMessage;

			await streamViaRovoDev({
				message: fullMessage,
				onTextDelta: (textDelta) => {
					if (!textDelta) {
						return;
					}

					fullResponse += textDelta;
					onTextDelta(textDelta);
				},
				conflictPolicy,
				timeoutMs: resolvedTimeoutMs,
				failOnError: true,
			});

			return fullResponse.trim();
		}

		const result = await generateTextViaRovoDev({
			system: systemPrompt,
			prompt: userMessage,
			conflictPolicy,
			timeoutMs: resolvedTimeoutMs,
		});
		return result.trim();
	};

	const callModelForMarkdown = async ({ provider, onTextDelta, ...rest }) => {
		if (provider === "rovodev") {
			return callRovoDevForMarkdown({
				...rest,
				onTextDelta,
			});
		}

		return callAIGatewayForMarkdown({
			...rest,
			providerKind: provider,
			onTextDelta,
		});
	};

	const resolveVisualSummaryProvider = async () => {
		let rovoDevAvailable = false;
		try {
			rovoDevAvailable = await isRovoDevAvailable();
		} catch (error) {
			logger.warn?.(
				"[AGENTS-RUN] Failed to check RovoDev availability for visual summary routing",
				error
			);
		}

		const fallbackEnabled = Boolean(isAIGatewayFallbackEnabled());
		if (rovoDevAvailable) {
			return "rovodev";
		}

		if (fallbackEnabled) {
			return "ai-gateway";
		}

		return "rovodev";
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

	const isAgentBusy = (run, agentId) =>
		run.tasks.some((task) => task.agentId === agentId && task.status === "in-progress");

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

	const ensureAgentRecord = (run, task) => {
		const existing = run.agents.find((agent) => agent.agentId === task.agentId);
		if (existing) {
			return existing;
		}

		const now = toIsoDate();
		const agent = {
			agentId: task.agentId,
			agentName: task.agentName,
			status: "idle",
			currentTaskId: null,
			currentTaskLabel: null,
			latestContent: "",
			updatedAt: now,
		};
		run.agents.push(agent);
		return agent;
	};

	const runTask = async (run, task) => {
		const agent = getAgentByTask(run, task) || ensureAgentRecord(run, task);
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
		agent.latestContent = "";
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
		// Route through RovoDev when pool is available, fall back to AI Gateway
		let rovodevReady = false;
		try {
			rovodevReady = await isRovoDevAvailable();
		} catch {
			// Ignore availability check errors — fall back to AI Gateway
		}
		const provider = rovodevReady ? "rovodev" : "ai-gateway";

			let output = "";
			let pendingStreamChunk = "";
			let pendingFlushTimeoutId = null;
			const appendAgentLatestContent = (chunk) => {
				if (!chunk) {
					return;
				}

			agent.latestContent = `${agent.latestContent}${chunk}`;
			if (agent.latestContent.length > STREAMING_UPDATE_MAX_CONTENT_CHARS) {
				agent.latestContent = agent.latestContent.slice(
					-STREAMING_UPDATE_MAX_CONTENT_CHARS
				);
			}
				agent.updatedAt = toIsoDate();
			};
			const flushWorkingUpdate = () => {
				if (pendingFlushTimeoutId !== null) {
					clearTimeout(pendingFlushTimeoutId);
					pendingFlushTimeoutId = null;
				}
				if (!pendingStreamChunk) {
					return;
				}

			const updateContent = pendingStreamChunk;
			pendingStreamChunk = "";
			appendAgentLatestContent(updateContent);
			emitAgentUpdateEvent(
				run,
					buildAgentExecutionUpdate(task, agent, "working", updateContent)
				);
			};
			const scheduleWorkingUpdateFlush = () => {
				if (pendingFlushTimeoutId !== null) {
					return;
				}

				pendingFlushTimeoutId = setTimeout(() => {
					pendingFlushTimeoutId = null;
					flushWorkingUpdate();
				}, STREAMING_UPDATE_FLUSH_MS);
			};
			const clearPendingWorkingUpdateFlush = () => {
				if (pendingFlushTimeoutId === null) {
					return;
				}

				clearTimeout(pendingFlushTimeoutId);
				pendingFlushTimeoutId = null;
			};
			try {
				output = await callModelForMarkdown({
				provider,
				prompt: taskPrompt,
				conversationHistory: run.conversationContext,
				contextDescription: `Plan title: ${run.plan.title}`,
				customSystemPrompt: taskSystemPrompt,
				userName: agent.agentName,
				conflictPolicy: "wait-for-turn",
				onTextDelta: (textDelta) => {
					if (!textDelta) {
						return;
					}

					pendingStreamChunk += textDelta;
						if (
							pendingStreamChunk.length >= STREAMING_UPDATE_CHUNK_SIZE ||
							pendingStreamChunk.includes("\n\n")
						) {
							flushWorkingUpdate();
							return;
						}
						scheduleWorkingUpdateFlush();
					},
				});
				flushWorkingUpdate();

			task.status = "done";
			task.completedAt = toIsoDate();
			task.output = output;
			task.outputSummary = toTaskSummaryText(task);
			agent.latestContent = task.outputSummary;
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
			flushWorkingUpdate();
			task.status = "failed";
			task.completedAt = toIsoDate();
			task.error = error instanceof Error ? error.message : String(error);
			agent.latestContent = task.error;
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
			} finally {
				clearPendingWorkingUpdateFlush();
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

	const synthesizeVisualSummary = async (run, summaryContent, tasksForSummary, isFailedStatus) => {
		const configuredVisualAgent = findConfiguredAgentByName(VISUAL_PRESENTER_AGENT_NAME);
		const skillContents = resolveSkillContentsForAgentName(VISUAL_PRESENTER_AGENT_NAME);
		const visualSystemPrompt =
			getNonEmptyString(configuredVisualAgent?.systemPrompt) ||
			"You are a frontend design specialist. Build polished, accessible HTML pages.";
		const provider = await resolveVisualSummaryProvider();
		const visualPrompt = createVisualSummaryPrompt(
			run,
			summaryContent,
			tasksForSummary,
			skillContents,
			isFailedStatus
		);

		try {
			const rawHtml = await callModelForMarkdown({
				provider,
				prompt: visualPrompt,
				conversationHistory: [],
				contextDescription: `Visual summary synthesis for run ${run.id}`,
				customSystemPrompt: visualSystemPrompt,
				userName: VISUAL_PRESENTER_AGENT_NAME,
				conflictPolicy: "wait-for-turn",
				timeoutMs: WAIT_FOR_TURN_TIMEOUT_MS,
			});
			return {
				html: ensureHtmlDocument(rawHtml, `${run.plan.title} visual summary`),
				partial: isFailedStatus,
				createdAt: toIsoDate(),
				agentName: VISUAL_PRESENTER_AGENT_NAME,
				status: "ready",
			};
		} catch (error) {
			const isRovoTurnTimeout =
				error &&
				typeof error === "object" &&
				error.code === "ROVODEV_CHAT_IN_PROGRESS_TIMEOUT";
			const errorMessage = isRovoTurnTimeout
				? `Visual summary timed out waiting for RovoDev turn (${Math.round(WAIT_FOR_TURN_TIMEOUT_MS / 60000)}m).`
				: error instanceof Error
					? error.message
					: "Failed to generate visual summary.";
			logger.warn?.("[AGENTS-RUN] Visual summary synthesis failed; using fallback", error);
			return {
				html: createFallbackVisualSummaryHtml(run, summaryContent, isFailedStatus),
				partial: isFailedStatus,
				createdAt: toIsoDate(),
				agentName: VISUAL_PRESENTER_AGENT_NAME,
				status: "failed",
				error: errorMessage,
			};
		}
	};

	const synthesizeGenuiWidget = async (
		run,
		summaryContent,
		tasksForSummary,
		isFailedStatus,
		widgetBlueprint,
		genuiSystemPrompt
	) => {
		const prompt = createGenuiSummaryPrompt(
			run,
			summaryContent,
			tasksForSummary,
			isFailedStatus,
			widgetBlueprint
		);
		const createdAt = toIsoDate();

		try {
			const rawText = await callModelForMarkdown({
				provider: "rovodev",
				prompt,
				conversationHistory: [],
				contextDescription: `Interactive summary widget ${widgetBlueprint.id} for run ${run.id}`,
				customSystemPrompt: genuiSystemPrompt,
				userName: "GenUI Presenter",
				conflictPolicy: "wait-for-turn",
			});

			const analysis = analyzeGeneratedText(rawText);
			const bestSpec = pickBestSpec(analysis);
			if (!bestSpec) {
				logger.warn?.(
					"[AGENTS-RUN] GenUI widget spec was not renderable; using fallback.",
					{
						runId: run.id,
						widgetId: widgetBlueprint.id,
					}
				);
				return {
					id: widgetBlueprint.id,
					title: widgetBlueprint.title,
					spec: createEmptyGenuiSpec(),
					status: "failed",
					createdAt,
					error: "Generated spec was not renderable.",
				};
			}

			return {
				id: widgetBlueprint.id,
				title: widgetBlueprint.title,
				spec: bestSpec,
				status: "ready",
				createdAt,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to generate interactive widget.";
			logger.warn?.("[AGENTS-RUN] GenUI widget synthesis failed", error);
			return {
				id: widgetBlueprint.id,
				title: widgetBlueprint.title,
				spec: createEmptyGenuiSpec(),
				status: "failed",
				createdAt,
				error: errorMessage,
			};
		}
	};

	const synthesizeGenuiSummary = async (run, summaryContent, tasksForSummary, isFailedStatus) => {
		const genuiSystemPrompt = getGenuiSummarySystemPrompt();
		const widgets = await Promise.all(
			GENUI_WIDGET_BLUEPRINTS.map((widgetBlueprint) =>
				synthesizeGenuiWidget(
					run,
					summaryContent,
					tasksForSummary,
					isFailedStatus,
					widgetBlueprint,
					genuiSystemPrompt
				)
			)
		);
		const readyWidgets = widgets.filter(
			(widget) => widget.status === "ready" && hasRenderableGenuiSpec(widget.spec)
		);
		const status = readyWidgets.length > 0 ? "ready" : "failed";
		const summaryError =
			status === "failed"
				? widgets
						.map((widget) => widget.error)
						.filter((error) => typeof error === "string" && error.trim())
						.join(" | ") || "Failed to generate interactive summary widgets."
				: undefined;

		return {
			widgets,
			spec:
				readyWidgets[0]?.spec ||
				(hasRenderableGenuiSpec(widgets[0]?.spec)
					? widgets[0].spec
					: createEmptyGenuiSpec()),
			partial: isFailedStatus,
			createdAt: toIsoDate(),
			status,
			error: summaryError,
		};
	};

	const synthesizeAudioSummary = async (summaryContent) => {
		const speechInput = markdownToSpeechText(summaryContent);
		if (!speechInput) {
			return null;
		}

		try {
		const synthesisResult = await synthesizeSound({
			input: speechInput,
			provider: "google",
			responseFormat: "mp3",
		});
			return synthesisResult;
		} catch (error) {
			logger.warn?.("[AGENTS-RUN] Audio summary synthesis failed", error);
			return null;
		}
	};

	const writeIterationArtifacts = async ({
		run,
		iteration,
		summary,
		visualSummary,
		genuiSummary,
		audioSummary,
		tasksForIteration,
	}) => {
		const paths = await ensureRunDirectories(run.id);
		const artifactEntries = [];
		const createdAt = toIsoDate();
		const summaryMarkdownFileName = `summary.iteration-${iteration}.md`;
		const summaryJsonFileName = `summary.iteration-${iteration}.json`;
		const visualHtmlFileName = `visual-summary.iteration-${iteration}.html`;
		const visualJsonFileName = `visual-summary.iteration-${iteration}.json`;
		const genuiJsonFileName = `genui-summary.iteration-${iteration}.json`;
		const audioFileName = `audio-summary.iteration-${iteration}.mp3`;
		const audioJsonFileName = `audio-summary.iteration-${iteration}.json`;

		const summaryMarkdownPath = path.join(paths.runDir, summaryMarkdownFileName);
		const summaryJsonPath = path.join(paths.runDir, summaryJsonFileName);
		await writeTextFile(summaryMarkdownPath, summary.content);
		await writeJsonFile(summaryJsonPath, { ...summary, iteration });
		await writeTextFile(paths.summaryMarkdownPath, summary.content);
		await writeJsonFile(paths.summaryJsonPath, summary);

		const summaryArtifactId = `summary-md-iteration-${iteration}`;
		artifactEntries.push({
			id: summaryArtifactId,
			type: ARTIFACT_TYPE_SUMMARY,
			title: `Executive summary (iteration ${iteration})`,
			path: summaryMarkdownFileName,
			url: buildArtifactUrl(run.id, summaryArtifactId),
			mimeType: "text/markdown",
			sizeBytes: Buffer.byteLength(summary.content, "utf8"),
			createdAt,
			iteration,
		});

		const visualHtmlPath = path.join(paths.runDir, visualHtmlFileName);
		const visualJsonPath = path.join(paths.runDir, visualJsonFileName);
		await writeTextFile(visualHtmlPath, visualSummary.html);
		await writeJsonFile(visualJsonPath, { ...visualSummary, iteration });
		await writeTextFile(paths.visualSummaryHtmlPath, visualSummary.html);
		await writeJsonFile(paths.visualSummaryJsonPath, visualSummary);

		const visualArtifactId = `visual-html-iteration-${iteration}`;
		artifactEntries.push({
			id: visualArtifactId,
			type: ARTIFACT_TYPE_VISUAL,
			title: `Visual summary (iteration ${iteration})`,
			path: visualHtmlFileName,
			url: buildArtifactUrl(run.id, visualArtifactId),
			mimeType: "text/html",
			sizeBytes: Buffer.byteLength(visualSummary.html, "utf8"),
			createdAt,
			iteration,
		});

		const genuiJsonPath = path.join(paths.runDir, genuiJsonFileName);
		await writeJsonFile(genuiJsonPath, { ...genuiSummary, iteration });
		await writeJsonFile(paths.genuiSummaryJsonPath, genuiSummary);

		const genuiArtifactId = `genui-json-iteration-${iteration}`;
		artifactEntries.push({
			id: genuiArtifactId,
			type: ARTIFACT_TYPE_GENUI,
			title: `Interactive summary spec (iteration ${iteration})`,
			path: genuiJsonFileName,
			url: buildArtifactUrl(run.id, genuiArtifactId),
			mimeType: "application/json",
			sizeBytes: Buffer.byteLength(JSON.stringify(genuiSummary), "utf8"),
			createdAt,
			iteration,
		});

		if (audioSummary?.audioBytes) {
			const audioPath = path.join(paths.runDir, audioFileName);
			const audioJsonPath = path.join(paths.runDir, audioJsonFileName);
			await fs.writeFile(audioPath, audioSummary.audioBytes);
			await writeJsonFile(audioJsonPath, {
				iteration,
				contentType: audioSummary.contentType,
				provider: audioSummary.provider,
				model: audioSummary.model,
				languageCode: audioSummary.languageCode,
				voice: audioSummary.voice,
				speed: audioSummary.speed,
				responseFormat: audioSummary.responseFormat,
				createdAt,
			});
			await fs.writeFile(paths.audioSummaryPath, audioSummary.audioBytes);
			await writeJsonFile(paths.audioSummaryJsonPath, {
				contentType: audioSummary.contentType,
				provider: audioSummary.provider,
				model: audioSummary.model,
				languageCode: audioSummary.languageCode,
				voice: audioSummary.voice,
				speed: audioSummary.speed,
				responseFormat: audioSummary.responseFormat,
				createdAt,
			});

			const audioArtifactId = `audio-iteration-${iteration}`;
			artifactEntries.push({
				id: audioArtifactId,
				type: ARTIFACT_TYPE_AUDIO,
				title: `Audio summary (iteration ${iteration})`,
				path: audioFileName,
				url: buildArtifactUrl(run.id, audioArtifactId),
				mimeType: audioSummary.contentType || "audio/mpeg",
				sizeBytes: audioSummary.audioBytes.length,
				createdAt,
				iteration,
			});
		}

		for (const task of tasksForIteration) {
			const taskContent = task.output || task.error;
			if (!taskContent) {
				continue;
			}

			const taskOutputFileName = `tasks/${task.id}.iteration-${iteration}.md`;
			const taskOutputPath = path.join(paths.runDir, taskOutputFileName);
			await writeTextFile(taskOutputPath, taskContent);
			const taskArtifactId = `task-output-${task.id}-iteration-${iteration}`;
			artifactEntries.push({
				id: taskArtifactId,
				type: ARTIFACT_TYPE_TASK_OUTPUT,
				title: `${task.id}: ${task.label}`,
				path: taskOutputFileName,
				url: buildArtifactUrl(run.id, taskArtifactId),
				mimeType: "text/markdown",
				sizeBytes: Buffer.byteLength(taskContent, "utf8"),
				createdAt,
				iteration,
				taskId: task.id,
			});
		}

		const linkArtifactByUrl = new Map();
		for (const link of extractLinksFromText(summary.content)) {
			linkArtifactByUrl.set(link, {
				id: `link-${iteration}-${linkArtifactByUrl.size + 1}`,
				type: ARTIFACT_TYPE_LINK,
				title: `Referenced link ${linkArtifactByUrl.size + 1}`,
				url: link,
				createdAt,
				iteration,
			});
		}
		for (const task of tasksForIteration) {
			for (const link of extractLinksFromText(task.output || "")) {
				if (linkArtifactByUrl.has(link)) {
					continue;
				}

				linkArtifactByUrl.set(link, {
					id: `link-${iteration}-${linkArtifactByUrl.size + 1}`,
					type: ARTIFACT_TYPE_LINK,
					title: `${task.id} link ${linkArtifactByUrl.size + 1}`,
					url: link,
					createdAt,
					iteration,
					taskId: task.id,
				});
			}
		}
		artifactEntries.push(...linkArtifactByUrl.values());

		replaceIterationArtifacts(run, iteration, artifactEntries);
	};

	const synthesizeRunSummary = async (run, iteration, isFailedStatus) => {
		const tasksForSummary = run.tasks.filter(
			(task) => (getPositiveInteger(task.iteration) || 1) <= iteration
		);
		const tasksForIteration = run.tasks.filter(
			(task) => (getPositiveInteger(task.iteration) || 1) === iteration
		);
		const summaryPrompt = createSummaryPrompt(run, tasksForSummary, isFailedStatus);
		let summaryContent = "";

		try {
			summaryContent = await callModelForMarkdown({
				provider: "ai-gateway",
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
			summaryContent = createFallbackSummary(run, tasksForSummary, isFailedStatus);
		}

		const summary = {
			content: summaryContent,
			partial: isFailedStatus,
			createdAt: toIsoDate(),
		};
		const [visualSummary, genuiSummary, audioSummary] = await Promise.all([
			synthesizeVisualSummary(run, summaryContent, tasksForSummary, isFailedStatus),
			synthesizeGenuiSummary(run, summaryContent, tasksForSummary, isFailedStatus),
			synthesizeAudioSummary(summaryContent),
		]);

		run.summary = summary;
		run.visualSummary = visualSummary;
		run.genuiSummary = genuiSummary;
		updateRunTimestamp(run);

		try {
			await writeIterationArtifacts({
				run,
				iteration,
				summary,
				visualSummary,
				genuiSummary,
				audioSummary,
				tasksForIteration,
			});
			await persistRunSnapshot(run);
		} catch (error) {
			logger.error?.("[AGENTS-RUN] Failed to persist run summary snapshot", error);
		}

		emitRunStateEvent(run, "run.summary-ready", {});
	};

	const hasPendingTasks = (run) =>
		run.tasks.some((task) => !TERMINAL_TASK_STATUSES.has(task.status));

	const finalizeRun = async (run) => {
		const currentIteration = run.iteration || 1;
		const currentIterationTasks = run.tasks.filter(
			(task) => (getPositiveInteger(task.iteration) || 1) === currentIteration
		);
		const scopedTasks = currentIterationTasks.length > 0 ? currentIterationTasks : run.tasks;
		const failedTasks = scopedTasks.filter((task) => FAILURE_TASK_STATUSES.has(task.status));
		const failed = failedTasks.length > 0;

		run.status = failed ? RUN_STATUS_FAILED : RUN_STATUS_COMPLETED;
		run.completedAt = toIsoDate();
		run.activeBatchId = null;
		updateRunTimestamp(run);

		try {
			await persistRunSnapshot(run);
		} catch (error) {
			logger.error?.("[AGENTS-RUN] Failed to persist finalized run snapshot", error);
		}

		if (failed) {
			emitRunStateEvent(run, "run.failed", {
				error: "One or more tasks failed.",
			});
		} else {
			emitRunStateEvent(run, "run.completed", {});
		}

		void synthesizeRunSummary(run, currentIteration, failed).catch((error) => {
			logger.error?.("[AGENTS-RUN] Failed to generate run summary", error);
		});
	};

	const scheduleRun = async (run) => {
		const activeTaskPromises = new Map();

		const launchReadyTasks = () => {
			markBlockedTasksWithFailedDependencies(run);

			for (const task of run.tasks) {
				if (activeTaskPromises.size >= maxConcurrentAgents) {
					break;
				}

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
					remainingTask.error =
						"Task could not be scheduled due to unresolved dependencies.";
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

	const ensureScheduler = (run) => {
		if (run.schedulerPromise) {
			return;
		}

		run.schedulerPromise = scheduleRun(run)
			.catch(async (error) => {
				logger.error?.("[AGENTS-RUN] Run scheduler crashed", error);
				run.status = RUN_STATUS_FAILED;
				run.error = error instanceof Error ? error.message : String(error);
				run.completedAt = toIsoDate();
				run.activeBatchId = null;
				updateRunTimestamp(run);
				await persistRunSnapshot(run);
				emitRunStateEvent(run, "run.failed", { error: run.error });
			})
			.finally(() => {
				run.schedulerPromise = null;
				if (hasPendingTasks(run)) {
					ensureScheduler(run);
				}
			});
	};

	const loadRunFromDisk = async (runId) => {
		const paths = buildRunPaths(runRootsDir, runId);
		try {
			const rawRun = await fs.readFile(paths.runFilePath, "utf8");
			const parsedRun = safeJsonParse(rawRun);
			if (!parsedRun || typeof parsedRun !== "object") {
				return null;
			}

			const normalizedRun = ensureRunDefaults(parsedRun);
			if (!normalizedRun) {
				return null;
			}

			if (!Array.isArray(normalizedRun.artifacts) || normalizedRun.artifacts.length === 0) {
				const rawArtifacts = await fs.readFile(paths.artifactsManifestPath, "utf8").catch(() => null);
				const parsedArtifacts = typeof rawArtifacts === "string" ? safeJsonParse(rawArtifacts) : null;
				normalizedRun.artifacts = normalizeArtifacts(parsedArtifacts);
			}

			return normalizedRun;
		} catch {
			return null;
		}
	};

	const ensureLiveRun = async (runId) => {
		const activeRun = runsById.get(runId);
		if (activeRun) {
			return activeRun;
		}

		const diskRun = await loadRunFromDisk(runId);
		if (!diskRun) {
			return null;
		}

		diskRun.events = [];
		diskRun.subscribers = new Set();
		diskRun.schedulerPromise = null;
		runsById.set(runId, diskRun);
		return diskRun;
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
		const normalizedDiskGenuiSummary = normalizeGenuiSummary(diskRun.genuiSummary);
		const normalizedParsedGenuiSummary = normalizeGenuiSummary(parsedGenuiSummary);

		return {
			run: toSerializableRun(diskRun),
			summary: parsedSummary || diskRun.summary || null,
			visualSummary: parsedVisualSummary || diskRun.visualSummary || null,
			genuiSummary: normalizedParsedGenuiSummary || normalizedDiskGenuiSummary || null,
		};
	};

	const getRun = async (runId) => {
		const activeRun = runsById.get(runId);
		if (activeRun) {
			return toSerializableRun(activeRun);
		}

		const diskRun = await loadRunFromDisk(runId);
		return diskRun ? toSerializableRun(diskRun) : null;
	};

	const listRuns = async (options = {}) => {
		const requestedLimit = getPositiveInteger(options.limit);
		const limit =
			typeof requestedLimit === "number"
				? Math.min(Math.max(requestedLimit, 1), MAX_RUN_LIST_LIMIT)
				: null;
		const runsByIdSnapshot = new Map(
			Array.from(runsById.values()).map((run) => [run.id, toSerializableRun(run)])
		);

		let runDirectories = [];
		try {
			const entries = await fs.readdir(runRootsDir, { withFileTypes: true });
			runDirectories = entries
				.filter((entry) => entry.isDirectory())
				.map((entry) => entry.name);
		} catch (error) {
			const errorCode = error && typeof error === "object" ? error.code : null;
			if (errorCode !== "ENOENT") {
				throw error;
			}
		}

		const diskRuns = await Promise.all(
			runDirectories.map(async (runId) => {
				const diskRun = await loadRunFromDisk(runId);
				return diskRun ? toSerializableRun(diskRun) : null;
			})
		);

		for (const run of diskRuns) {
			if (!run) {
				continue;
			}

			if (!runsByIdSnapshot.has(run.runId)) {
				runsByIdSnapshot.set(run.runId, run);
			}
		}

		const sortedRuns = Array.from(runsByIdSnapshot.values()).sort((leftRun, rightRun) => {
			const leftUpdatedAt = getTimestampFromIsoString(leftRun.updatedAt);
			const rightUpdatedAt = getTimestampFromIsoString(rightRun.updatedAt);

			if (Number.isFinite(leftUpdatedAt) && Number.isFinite(rightUpdatedAt)) {
				if (leftUpdatedAt !== rightUpdatedAt) {
					return rightUpdatedAt - leftUpdatedAt;
				}
			} else if (Number.isFinite(rightUpdatedAt)) {
				return 1;
			} else if (Number.isFinite(leftUpdatedAt)) {
				return -1;
			}

			const leftCreatedAt = getTimestampFromIsoString(leftRun.createdAt);
			const rightCreatedAt = getTimestampFromIsoString(rightRun.createdAt);
			if (Number.isFinite(leftCreatedAt) && Number.isFinite(rightCreatedAt)) {
				if (leftCreatedAt !== rightCreatedAt) {
					return rightCreatedAt - leftCreatedAt;
				}
			} else if (Number.isFinite(rightCreatedAt)) {
				return 1;
			} else if (Number.isFinite(leftCreatedAt)) {
				return -1;
			}

			return rightRun.runId.localeCompare(leftRun.runId);
		});

		if (typeof limit === "number") {
			return sortedRuns.slice(0, limit);
		}

		return sortedRuns;
	};

	const getRunSummary = async (runId) => {
		const activeRun = runsById.get(runId);
		if (activeRun) {
			return {
				run: toSerializableRun(activeRun),
				summary: activeRun.summary ?? null,
				visualSummary: activeRun.visualSummary ?? null,
				genuiSummary: normalizeGenuiSummary(activeRun.genuiSummary),
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

	const getRunFiles = async (runId) => {
		const activeRun = runsById.get(runId);
		if (activeRun) {
			return {
				run: toSerializableRun(activeRun),
				artifacts: activeRun.artifacts || [],
			};
		}

		const diskRun = await loadRunFromDisk(runId);
		if (!diskRun) {
			return null;
		}

		return {
			run: toSerializableRun(diskRun),
			artifacts: diskRun.artifacts || [],
		};
	};

	const getRunFile = async (runId, artifactId) => {
		const filesPayload = await getRunFiles(runId);
		if (!filesPayload) {
			return null;
		}

		const artifact = (filesPayload.artifacts || []).find((item) => item.id === artifactId);
		if (!artifact) {
			return null;
		}

		if (artifact.type === ARTIFACT_TYPE_LINK && artifact.url) {
			return {
				type: "redirect",
				url: artifact.url,
			};
		}

		if (!artifact.path) {
			return null;
		}

		const paths = buildRunPaths(runRootsDir, runId);
		const absolutePath = path.resolve(paths.runDir, artifact.path);
		const normalizedRunDir = `${path.resolve(paths.runDir)}${path.sep}`;
		if (!absolutePath.startsWith(normalizedRunDir)) {
			throw new Error("Invalid artifact path");
		}

		const buffer = await fs.readFile(absolutePath);
		return {
			type: "file",
			buffer,
			mimeType: artifact.mimeType || "application/octet-stream",
			fileName: path.basename(artifact.path),
		};
	};

	const createFallbackPlanDelta = (run, prompt) => {
		return {
			title: run.plan.title,
			tasks: [
				{
					id: `followup-${run.iteration + 1}`,
					label: prompt,
					agent: "Rovo",
					blockedBy: [],
				},
			],
		};
	};

	const generatePlanDeltaFromPrompt = async (run, prompt, contextPrompt) => {
		const appendPrompt = createAppendTasksPrompt(run, prompt, contextPrompt);

		try {
			const generatedText = await callModelForMarkdown({
				provider: "ai-gateway",
				prompt: appendPrompt,
				conversationHistory: run.conversationContext,
				contextDescription: `Create additional execution tasks for run ${run.id}`,
				customSystemPrompt: "You return strict JSON for multi-agent task planning.",
				userName: "Task Planner",
				conflictPolicy: "wait-for-turn",
			});
			const parsedPayload = parseJsonObjectFromText(generatedText);
			if (parsedPayload) {
				if (
					Array.isArray(parsedPayload.tasks) &&
					isLinearChain(parsedPayload.tasks)
				) {
					parsedPayload.tasks = inferTaskDependencies(parsedPayload.tasks);
				}
				return parsedPayload;
			}
		} catch (error) {
			logger.warn?.("[AGENTS-RUN] Failed to generate plan delta; using fallback", error);
		}

		return createFallbackPlanDelta(run, prompt);
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
		ensureScheduler(run);

		return toSerializableRun(run);
	};

	const addDirective = async (runId, { agentName, message }) => {
		const run = await ensureLiveRun(runId);
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

	const appendTasks = async (
		runId,
		{
			planDelta,
			prompt,
			contextPrompt,
			conversation,
			customInstruction,
			retryTaskIds,
		}
	) => {
		const run = await ensureLiveRun(runId);
		if (!run) {
			return { error: "Run not found." };
		}

		const normalizedRetryTaskIds = normalizeTaskIdArray(retryTaskIds);
		if (normalizedRetryTaskIds.length > 0) {
			const retriableTasks = [];
			for (const taskId of normalizedRetryTaskIds) {
				const task = run.tasks.find((item) => item.id === taskId) || null;
				if (!task) {
					continue;
				}

				if (!FAILURE_TASK_STATUSES.has(task.status)) {
					continue;
				}

				retriableTasks.push(task);
			}

			if (retriableTasks.length === 0) {
				return { error: "No failed tasks were eligible for retry." };
			}

			const nextIteration = (run.iteration || 1) + 1;
			const batchId = createId("batch");
			const now = toIsoDate();

			for (const task of retriableTasks) {
				task.status = "todo";
				task.startedAt = null;
				task.completedAt = null;
				task.error = null;
				task.output = null;
				task.outputSummary = null;
				task.iteration = nextIteration;
				task.batchId = batchId;
				emitRunStateEvent(run, "task.retrying", {
					taskId: task.id,
					attempt: task.attempts + 1,
				});
			}

			for (const agent of run.agents) {
				if (agent.status === "failed") {
					agent.status = "idle";
					agent.currentTaskId = null;
					agent.currentTaskLabel = null;
					agent.updatedAt = now;
				}
			}

			run.status = RUN_STATUS_RUNNING;
			run.error = null;
			run.completedAt = null;
			run.iteration = nextIteration;
			run.activeBatchId = batchId;
			updateRunTimestamp(run);
			await persistIntermediateSnapshot(run);
			emitRunStateEvent(run, "run.resumed", {});
			ensureScheduler(run);

			return {
				run: toSerializableRun(run),
				retriedTaskIds: retriableTasks.map((task) => task.id),
			};
		}

		const normalizedPrompt = getNonEmptyString(prompt);
		let resolvedPlanDelta = planDelta;
		if (!resolvedPlanDelta) {
			if (!normalizedPrompt) {
				return { error: "A prompt or planDelta is required to append tasks." };
			}

			resolvedPlanDelta = await generatePlanDeltaFromPrompt(
				run,
				normalizedPrompt,
				getNonEmptyString(contextPrompt)
			);
		}

		const existingTaskIds = new Set(run.tasks.map((task) => task.id));
		const normalizedPlanDelta = normalizePlanDelta(resolvedPlanDelta, existingTaskIds);
		if (!normalizedPlanDelta) {
			return { error: "Unable to create a valid task delta." };
		}

		const nextIteration = (run.iteration || 1) + 1;
		const batchId = createId("batch");
		const now = toIsoDate();
		const appendedTasks = normalizedPlanDelta.tasks.map((task) => ({
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
			iteration: nextIteration,
			batchId,
		}));

		run.tasks.push(...appendedTasks);
		run.plan.tasks.push(
			...appendedTasks.map((task) => ({
				id: task.id,
				label: task.label,
				agent: task.agentName,
				blockedBy: task.blockedBy,
			}))
		);

		const mergedAgents = new Set(run.plan.agents || []);
		for (const task of appendedTasks) {
			mergedAgents.add(task.agentName);
			ensureAgentRecord(run, task);
		}
		run.plan.agents = Array.from(mergedAgents).sort();

		run.status = RUN_STATUS_RUNNING;
		run.error = null;
		run.completedAt = null;
		run.iteration = nextIteration;
		run.activeBatchId = batchId;
		run.userPrompt = normalizedPrompt || run.userPrompt;

		const normalizedCustomInstruction = getNonEmptyString(customInstruction);
		if (normalizedCustomInstruction) {
			run.customInstruction = normalizedCustomInstruction;
		}

		const nextConversationEntries = [
			...run.conversationContext,
			...buildConversationContext(conversation),
			...(normalizedPrompt
				? [
					{
						type: "user",
						content: normalizedPrompt,
					},
				]
				: []),
		];
		run.conversationContext = nextConversationEntries.slice(-20);

		for (const agent of run.agents) {
			if (agent.status === "failed") {
				agent.status = "idle";
				agent.currentTaskId = null;
				agent.currentTaskLabel = null;
				agent.updatedAt = now;
			}
		}

		updateRunTimestamp(run);
		await persistIntermediateSnapshot(run);
		emitRunStateEvent(run, "run.resumed", {});
		ensureScheduler(run);

		return {
			run: toSerializableRun(run),
			planDelta: {
				title: normalizedPlanDelta.title,
				description: normalizedPlanDelta.description,
				emoji: normalizedPlanDelta.emoji,
				agents: normalizedPlanDelta.agents,
				tasks: normalizedPlanDelta.tasks.map((task) => ({
					id: task.id,
					label: task.label,
					agent: task.agentName,
					blockedBy: task.blockedBy,
				})),
			},
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
			res.write(
				`data: ${JSON.stringify(
					buildSseEvent("snapshot", { run: toSerializableRun(diskRun) })
				)}\n\n`
			);
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

	const deleteRun = async (runId) => {
		runsById.delete(runId);

		const paths = buildRunPaths(runRootsDir, runId);
		try {
			await fs.rm(paths.runDir, { recursive: true, force: true });
		} catch (error) {
			const errorCode = error && typeof error === "object" ? error.code : null;
			if (errorCode !== "ENOENT") {
				throw error;
			}
		}
	};

	return {
		createRun,
		listRuns,
		getRun,
		deleteRun,
		getRunSummary,
		getRunVisualSummary,
		getRunFiles,
		getRunFile,
		appendTasks,
		addDirective,
		streamRunEvents,
	};
}

module.exports = {
	createRunManager,
};
