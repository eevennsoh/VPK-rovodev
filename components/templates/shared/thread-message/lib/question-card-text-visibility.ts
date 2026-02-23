interface ShouldSuppressQuestionCardMessageTextOptions {
	shouldShowWidgetSections: boolean;
	widgetType: string | undefined;
	isStreaming: boolean;
	widgetPayload: unknown;
	messageText?: string;
}

const TRANSLATION_CLARIFICATION_SESSION_PREFIX = "translation-clarification-";
const TRANSLATION_CLARIFICATION_LEGACY_SESSION_ID = "translation-clarification";
const TRANSLATION_SIGNAL_PATTERN =
	/\b(translate|translation|target language|source language|text to translate|what text should i translate|which language should i translate)\b/i;

function getQuestionCardSessionId(payload: unknown): string | null {
	if (!payload || typeof payload !== "object") {
		return null;
	}

	const record = payload as { sessionId?: unknown };
	if (typeof record.sessionId !== "string") {
		return null;
	}

	const normalizedSessionId = record.sessionId.trim();
	return normalizedSessionId.length > 0 ? normalizedSessionId : null;
}

function getNonEmptyString(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}

	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : null;
}

function collectTranslationSignalsFromPayload(payload: unknown): string[] {
	if (!payload || typeof payload !== "object") {
		return [];
	}

	const record = payload as {
		title?: unknown;
		description?: unknown;
		questions?: unknown;
	};
	const result: string[] = [];
	const title = getNonEmptyString(record.title);
	const description = getNonEmptyString(record.description);

	if (title) {
		result.push(title);
	}
	if (description) {
		result.push(description);
	}

	if (!Array.isArray(record.questions)) {
		return result;
	}

	for (const question of record.questions) {
		if (!question || typeof question !== "object") {
			continue;
		}

		const questionRecord = question as {
			id?: unknown;
			label?: unknown;
			header?: unknown;
			description?: unknown;
		};
		const id = getNonEmptyString(questionRecord.id);
		const label = getNonEmptyString(questionRecord.label);
		const header = getNonEmptyString(questionRecord.header);
		const questionDescription = getNonEmptyString(questionRecord.description);

		if (id) {
			result.push(id);
		}
		if (label) {
			result.push(label);
		}
		if (header) {
			result.push(header);
		}
		if (questionDescription) {
			result.push(questionDescription);
		}
	}

	return result;
}

function includesTranslationSignal(value: string): boolean {
	return TRANSLATION_SIGNAL_PATTERN.test(value);
}

export function isTranslationClarificationQuestionCard(
	payload: unknown,
	messageText?: string
): boolean {
	const sessionId = getQuestionCardSessionId(payload);
	if (!sessionId) {
		const normalizedMessageText = getNonEmptyString(messageText);
		if (normalizedMessageText && includesTranslationSignal(normalizedMessageText)) {
			return true;
		}
		return collectTranslationSignalsFromPayload(payload).some(includesTranslationSignal);
	}

	if (
		sessionId === TRANSLATION_CLARIFICATION_LEGACY_SESSION_ID ||
		sessionId.startsWith(TRANSLATION_CLARIFICATION_SESSION_PREFIX)
	) {
		return true;
	}

	const normalizedMessageText = getNonEmptyString(messageText);
	if (normalizedMessageText && includesTranslationSignal(normalizedMessageText)) {
		return true;
	}

	return collectTranslationSignalsFromPayload(payload).some(includesTranslationSignal);
}

export function shouldSuppressQuestionCardMessageText({
	shouldShowWidgetSections,
	widgetType,
	isStreaming,
	widgetPayload,
	messageText,
}: Readonly<ShouldSuppressQuestionCardMessageTextOptions>): boolean {
	if (!shouldShowWidgetSections || widgetType !== "question-card" || isStreaming) {
		return false;
	}

	return !isTranslationClarificationQuestionCard(widgetPayload, messageText);
}
