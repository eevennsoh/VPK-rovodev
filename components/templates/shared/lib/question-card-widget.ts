import type { RovoUIMessage } from "@/lib/rovo-ui-messages";

interface StringRecord {
	[key: string]: unknown;
}

type QuestionKind = "single-select" | "multi-select" | "text";

export type ClarificationAnswerValue = string | string[];
export type ClarificationAnswers = Record<string, ClarificationAnswerValue>;

export interface ClarificationSubmission {
	sessionId: string;
	round: number;
	answers: ClarificationAnswers;
	completed: boolean;
}

export interface ParsedQuestionCardOption {
	id: string;
	label: string;
	description?: string;
	recommended?: boolean;
}

export interface ParsedQuestionCardQuestion {
	id: string;
	label: string;
	description?: string;
	required: boolean;
	kind: QuestionKind;
	options: ParsedQuestionCardOption[];
	placeholder?: string;
}

export interface ParsedQuestionCardPayload {
	type: "question-card";
	sessionId: string;
	round: number;
	maxRounds: number;
	title: string;
	description?: string;
	directive?: string;
	requiredCount: number;
	questions: ParsedQuestionCardQuestion[];
}

const DEFAULT_SESSION_ID = "clarification-session";
const DEFAULT_MAX_ROUNDS = 3;
const DEFAULT_TITLE = "Help me clarify this";
const DEFAULT_PLACEHOLDER = "Tell Rovo what to do...";
const MAX_GENERATED_OPTIONS = 8;
const MAX_LABEL_LENGTH = 120;

/**
 * Matches options that just say the user will type/enter/provide their own answer,
 * e.g. "I'll type the space name", "I will enter it myself", "Type my own".
 * These are redundant when the custom input field is shown.
 */
const SELF_TYPE_OPTION_PATTERN =
	/^i('ll| will) (type|enter|specify|provide|write|input)\b|^(type|enter|specify|provide|write) (my own|it myself|manually)/i;
const QUESTION_KINDS: ReadonlySet<QuestionKind> = new Set([
	"single-select",
	"multi-select",
	"text",
]);

function isStringRecord(value: unknown): value is StringRecord {
	return typeof value === "object" && value !== null;
}

function getNonEmptyString(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}

	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : null;
}

function getPositiveInteger(value: unknown): number | null {
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

function normalizeAnswerValue(value: unknown): ClarificationAnswerValue | null {
	if (typeof value === "string") {
		const normalizedValue = value.trim();
		return normalizedValue.length > 0 ? normalizedValue : null;
	}

	if (!Array.isArray(value)) {
		return null;
	}

	const normalizedValues = value
		.map((item) => (typeof item === "string" ? item.trim() : ""))
		.filter((item) => item.length > 0);
	return normalizedValues.length > 0 ? normalizedValues : null;
}

function normalizeQuestionKind(value: unknown): QuestionKind {
	if (typeof value !== "string") {
		return "single-select";
	}

	const normalizedValue = value.trim().toLowerCase() as QuestionKind;
	return QUESTION_KINDS.has(normalizedValue) ? normalizedValue : "single-select";
}

function normalizeQuestionOptions(value: unknown): ParsedQuestionCardOption[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const seenOptionIds = new Set<string>();
	const seenOptionLabels = new Set<string>();
	const options: ParsedQuestionCardOption[] = [];

	for (const [index, option] of value.entries()) {
		if (!isStringRecord(option)) continue;

		const label =
			getNonEmptyString(option.label) ??
			getNonEmptyString(option.title) ??
			getNonEmptyString(option.text);
		if (!label) continue;

		// Skip options that just tell the user to type their own answer —
		// the custom input field already serves that purpose.
		if (SELF_TYPE_OPTION_PATTERN.test(label)) continue;

		const optionId = getNonEmptyString(option.id) ?? `option-${index + 1}`;
		const normalizedLabel = label.toLowerCase();
		if (seenOptionIds.has(optionId) || seenOptionLabels.has(normalizedLabel)) {
			continue;
		}

		seenOptionIds.add(optionId);
		seenOptionLabels.add(normalizedLabel);
		options.push({
			id: optionId,
			label,
			description: getNonEmptyString(option.description) ?? undefined,
			recommended: Boolean(option.recommended),
		});
	}

	return options.slice(0, MAX_GENERATED_OPTIONS);
}

function createFallbackQuestionOptions(): ParsedQuestionCardOption[] {
	return [];
}

function getUniqueQuestionId(baseId: string, seenQuestionIds: Set<string>): string {
	let uniqueQuestionId = baseId;
	let duplicateIndex = 2;
	while (seenQuestionIds.has(uniqueQuestionId)) {
		uniqueQuestionId = `${baseId}-${duplicateIndex}`;
		duplicateIndex += 1;
	}

	seenQuestionIds.add(uniqueQuestionId);
	return uniqueQuestionId;
}

export function parseQuestionCardPayload(
	value: unknown
): ParsedQuestionCardPayload | null {
	if (!isStringRecord(value)) {
		return null;
	}

	const record = isStringRecord(value.payload) ? value.payload : value;
	const recordType = getNonEmptyString(record.type);
	if (recordType && recordType !== "question-card") {
		return null;
	}

	const questionsValue = Array.isArray(record.questions)
		? record.questions
		: Array.isArray(record.items)
			? record.items
			: null;
	if (!questionsValue || questionsValue.length === 0) {
		return null;
	}

	const questions: ParsedQuestionCardQuestion[] = [];
	const seenQuestionIds = new Set<string>();
	const seenLabels = new Set<string>();

	for (const [index, question] of questionsValue.entries()) {
		if (!isStringRecord(question)) continue;

		const questionLabel =
			getNonEmptyString(question.label) ??
			getNonEmptyString(question.title) ??
			getNonEmptyString(question.question) ??
			getNonEmptyString(question.text);
		if (!questionLabel) continue;

		const truncatedLabel = questionLabel.length > MAX_LABEL_LENGTH
			? questionLabel.slice(0, MAX_LABEL_LENGTH - 1) + "\u2026"
			: questionLabel;
		const normalizedLabel = truncatedLabel.toLowerCase();
		if (seenLabels.has(normalizedLabel)) continue;
		seenLabels.add(normalizedLabel);

		const parsedOptions = normalizeQuestionOptions(question.options);
		const options =
			parsedOptions.length > 0
				? parsedOptions
				: createFallbackQuestionOptions();
		const baseQuestionId = getNonEmptyString(question.id) ?? `q-${index + 1}`;
		const questionId = getUniqueQuestionId(baseQuestionId, seenQuestionIds);

		questions.push({
			id: questionId,
			label: truncatedLabel,
			description: getNonEmptyString(question.description) ?? undefined,
			required: question.required !== false,
			kind: normalizeQuestionKind(question.kind),
			options,
			placeholder: DEFAULT_PLACEHOLDER,
		});
	}
	if (questions.length === 0) {
		return null;
	}

	const requiredCount = questions.filter((question) => question.required).length;
	return {
		type: "question-card",
		sessionId: getNonEmptyString(record.sessionId) ?? DEFAULT_SESSION_ID,
		round: getPositiveInteger(record.round) ?? 1,
		maxRounds: getPositiveInteger(record.maxRounds) ?? DEFAULT_MAX_ROUNDS,
		title: getNonEmptyString(record.title) ?? DEFAULT_TITLE,
		description: getNonEmptyString(record.description) ?? undefined,
		directive: getNonEmptyString(record.directive) ?? undefined,
		requiredCount,
		questions,
	};
}

function isAnswerProvided(
	question: ParsedQuestionCardQuestion,
	answers: ClarificationAnswers
): boolean {
	const answerValue = answers[question.id];
	if (question.kind === "multi-select") {
		return Array.isArray(answerValue) && answerValue.length > 0;
	}

	return typeof answerValue === "string" && answerValue.trim().length > 0;
}

function sanitizeClarificationAnswers(
	questionCard: ParsedQuestionCardPayload,
	answers: ClarificationAnswers
): ClarificationAnswers {
	return questionCard.questions.reduce<ClarificationAnswers>((result, question) => {
		const normalizedAnswerValue = normalizeAnswerValue(answers[question.id]);
		if (!normalizedAnswerValue) {
			return result;
		}

		result[question.id] = normalizedAnswerValue;
		return result;
	}, {});
}

function resolveAnswerOptionLabel(
	question: ParsedQuestionCardQuestion,
	answer: string
): string {
	const matchingOption = question.options.find((option) => option.id === answer);
	return matchingOption?.label ?? answer;
}

function formatAnswerForSummary(
	question: ParsedQuestionCardQuestion,
	value: ClarificationAnswerValue
): string {
	if (Array.isArray(value)) {
		return value.map((answer) => resolveAnswerOptionLabel(question, answer)).join(", ");
	}

	return resolveAnswerOptionLabel(question, value);
}

export function hasRequiredClarificationAnswers(
	questionCard: ParsedQuestionCardPayload,
	answers: ClarificationAnswers
): boolean {
	return questionCard.questions.every((question) => {
		if (!question.required) {
			return true;
		}

		return isAnswerProvided(question, answers);
	});
}

export function createClarificationSubmission(
	questionCard: ParsedQuestionCardPayload,
	answers: ClarificationAnswers
): ClarificationSubmission {
	const sanitizedAnswers = sanitizeClarificationAnswers(questionCard, answers);

	return {
		sessionId: questionCard.sessionId,
		round: questionCard.round,
		answers: sanitizedAnswers,
		completed: hasRequiredClarificationAnswers(questionCard, sanitizedAnswers),
	};
}

export function buildClarificationSummaryPrompt(
	questionCard: ParsedQuestionCardPayload,
	answers: ClarificationAnswers
): string {
	const sanitizedAnswers = sanitizeClarificationAnswers(questionCard, answers);
	const answerSummaryLines = questionCard.questions
		.map((question) => {
			const answerValue = sanitizedAnswers[question.id];
			if (!answerValue) {
				return null;
			}

			return `- ${question.label}: ${formatAnswerForSummary(question, answerValue)}`;
		})
		.filter((line): line is string => line !== null);

	if (answerSummaryLines.length === 0) {
		return `Please continue with a best-effort plan for "${questionCard.title}".`;
	}

	const defaultDirective = [
		"Use these details to generate the final plan tasks now.",
		"If you still need more information, ask follow-up questions using the request_user_input tool so they render as question cards.",
		"Use the create-plan skill and return a plan widget with concrete tasks.",
	].join("\n");

	return [
		`Here are my clarification answers for "${questionCard.title}":`,
		...answerSummaryLines,
		"",
		questionCard.directive || defaultDirective,
	].join("\n");
}

/**
 * Adapts QuestionCard answers to the format expected by the ask_user_questions tool.
 *
 * The tool expects `Record<string, string[]>` where keys are question *text* (labels),
 * not question IDs. This function maps question IDs back to their labels and normalizes
 * all answer values to `string[]` (the tool always expects a list, even for single-select).
 *
 * @param answers - ID-keyed answers from the QuestionCard component
 * @param questions - The parsed questions that were displayed (provides ID → label mapping)
 * @returns Text-keyed answers with array values matching the tool contract
 */
export function adaptAnswersForToolContract(
	answers: ClarificationAnswers,
	questions: ReadonlyArray<ParsedQuestionCardQuestion>
): Record<string, string[]> {
	const idToLabel = new Map(questions.map((q) => [q.id, q.label]));

	return Object.entries(answers).reduce<Record<string, string[]>>(
		(acc, [questionId, value]) => {
			const questionText = idToLabel.get(questionId) ?? questionId;
			acc[questionText] = Array.isArray(value) ? value : [value];
			return acc;
		},
		{}
	);
}

/**
 * Builds a system-level message to notify RovoDev that the user skipped/dismissed
 * a clarification question card. RovoDev can then decide how to respond (e.g.,
 * "I need more context" or proceed with caveats).
 */
export function buildClarificationDismissPrompt(
	questionCard: ParsedQuestionCardPayload
): string {
	return [
		`The user skipped the clarification questions for "${questionCard.title}".`,
		"They chose not to answer. Please proceed with whatever context you have,",
		"or let them know what information you still need.",
	].join(" ");
}

export function getLatestQuestionCardPayload(
	messages: ReadonlyArray<RovoUIMessage>
): ParsedQuestionCardPayload | null {
	const latestAssistantMessageIndex = messages.findLastIndex(
		(message) => message.role === "assistant"
	);
	if (latestAssistantMessageIndex === -1) {
		return null;
	}

	const latestUserMessageIndex = messages.findLastIndex(
		(message) => message.role === "user"
	);
	if (latestUserMessageIndex > latestAssistantMessageIndex) {
		return null;
	}

	const latestAssistantMessage = messages[latestAssistantMessageIndex];
	for (
		let partIndex = latestAssistantMessage.parts.length - 1;
		partIndex >= 0;
		partIndex--
	) {
		const part = latestAssistantMessage.parts[partIndex] as {
			type?: string;
			data?: {
				type?: unknown;
				payload?: unknown;
			};
		};

		if (part.type !== "data-widget-data") {
			continue;
		}

		const widgetType = getNonEmptyString(part.data?.type);
		if (!widgetType) {
			continue;
		}

		if (widgetType !== "question-card") {
			return null;
		}

		return parseQuestionCardPayload(part.data?.payload);
	}

	return null;
}
