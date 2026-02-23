interface ResolveThinkingStatusActiveOptions {
	hasThinkingStatusPart: boolean;
	hasThinkingEvents: boolean;
	isRetryThinkingStatus: boolean;
	isStreaming: boolean;
}

export function isThinkingStatusActive({
	hasThinkingStatusPart,
	hasThinkingEvents,
	isRetryThinkingStatus,
	isStreaming,
}: Readonly<ResolveThinkingStatusActiveOptions>): boolean {
	const hasThinkingSignals = hasThinkingStatusPart || hasThinkingEvents;
	if (!hasThinkingSignals) {
		return false;
	}

	if (isRetryThinkingStatus && !isStreaming) {
		return false;
	}

	return true;
}
