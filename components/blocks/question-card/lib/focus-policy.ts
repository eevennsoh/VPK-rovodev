interface ResolveQuestionCardFocusModeOptions {
	optionCount: number;
	maxVisibleOptions: number;
	showCustomInput: boolean;
}

function normalizeNonNegativeInteger(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}

	return Math.max(0, Math.floor(value));
}

export function shouldAutoFocusCustomInputForQuestion({
	optionCount,
	maxVisibleOptions,
	showCustomInput,
}: Readonly<ResolveQuestionCardFocusModeOptions>): boolean {
	if (!showCustomInput) {
		return false;
	}

	const normalizedOptionCount = normalizeNonNegativeInteger(optionCount);
	const normalizedMaxVisibleOptions = normalizeNonNegativeInteger(maxVisibleOptions);
	const visibleOptionCount = Math.min(normalizedOptionCount, normalizedMaxVisibleOptions);
	return visibleOptionCount === 0;
}
