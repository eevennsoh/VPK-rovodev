const { hasGateSkipSource } = require("./planning-question-gate");
const { resolveUnsatisfiedContextHints } = require("./tool-first-genui-policy");
const { sanitizeQuestionCardPayload } = require("./question-card-payload");

function shouldGateToolFirstQuestionCard({
	prompt,
	toolFirstPolicy,
	latestUserMessageSource,
	gateSkipSources,
} = {}) {
	if (hasGateSkipSource(latestUserMessageSource, gateSkipSources)) {
		return { shouldGate: false, unsatisfiedHints: [] };
	}

	if (!toolFirstPolicy || !toolFirstPolicy.matched) {
		return { shouldGate: false, unsatisfiedHints: [] };
	}

	const unsatisfiedHints = resolveUnsatisfiedContextHints({
		prompt,
		domains: toolFirstPolicy.domains,
	});

	if (unsatisfiedHints.length === 0) {
		return { shouldGate: false, unsatisfiedHints: [] };
	}

	return { shouldGate: true, unsatisfiedHints };
}

function buildToolFirstQuestionCardPayload({
	unsatisfiedHints,
	domainLabels,
	sessionId,
} = {}) {
	if (!Array.isArray(unsatisfiedHints) || unsatisfiedHints.length === 0) {
		return null;
	}

	const questions = unsatisfiedHints.map((hint, index) => {
		const options = Array.isArray(hint.suggestedOptions)
			? hint.suggestedOptions.map((opt, optIndex) => ({
				id: opt.id || `option-${optIndex + 1}`,
				label: opt.label || `Option ${optIndex + 1}`,
				description: opt.description || undefined,
			}))
			: [];

		return {
			id: hint.id || `q-${index + 1}`,
			label: hint.label || `Question ${index + 1}`,
			description: hint.description || undefined,
			required: true,
			kind: "single-select",
			options,
		};
	});

	const domainList = Array.isArray(domainLabels) && domainLabels.length > 0
		? domainLabels.join(", ")
		: "this tool";

	return sanitizeQuestionCardPayload(
		{
			type: "question-card",
			title: `Before I use ${domainList}...`,
			description: "Answer these so I can execute the right action.",
			questions,
		},
		{
			sessionId: sessionId || `tool-first-clarification-${Date.now()}`,
			maxRounds: 1,
		}
	);
}

function buildToolFirstClarificationInstruction({
	unsatisfiedHints,
	domainLabels,
} = {}) {
	if (!Array.isArray(unsatisfiedHints) || unsatisfiedHints.length === 0) {
		return null;
	}

	const resolvedDomainList =
		Array.isArray(domainLabels) && domainLabels.length > 0
			? domainLabels.join(", ")
			: "this integration task";
	const seenHintIds = new Set();
	const promptLabels = [];
	for (const hint of unsatisfiedHints) {
		const normalizedHintId =
			typeof hint?.id === "string" && hint.id.trim().length > 0
				? hint.id.trim()
				: null;
		if (normalizedHintId && seenHintIds.has(normalizedHintId)) {
			continue;
		}
		if (normalizedHintId) {
			seenHintIds.add(normalizedHintId);
		}
		const label =
			typeof hint?.label === "string" && hint.label.trim().length > 0
				? hint.label.trim()
				: "Required detail";
		promptLabels.push(`- ${label}`);
	}

	if (promptLabels.length === 0) {
		return null;
	}

	return [
		"[Clarification-first directive]",
		`This ${resolvedDomainList} request is missing required details.`,
		"Before executing integration actions, call the ask_user_questions tool (or request_user_input) to gather these details as question cards.",
		"Do not assume missing values or finalize the action until the user answers.",
		"Collect these details:",
		...promptLabels,
	].join("\n");
}

module.exports = {
	shouldGateToolFirstQuestionCard,
	buildToolFirstQuestionCardPayload,
	buildToolFirstClarificationInstruction,
};
