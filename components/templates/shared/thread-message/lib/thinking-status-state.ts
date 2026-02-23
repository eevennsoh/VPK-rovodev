interface ResolveThinkingStatusActiveOptions {
	hasThinkingStatusPart: boolean;
	hasThinkingEvents: boolean;
	isRetryThinkingStatus: boolean;
	isStreaming: boolean;
}

interface ResolveThinkingStatusLifecycleStreamingOptions {
	isThinkingLifecycleStreaming: boolean;
	isThinkingStatusActive: boolean;
	hasBackendThinkingActivity: boolean;
}

interface ResolvePostToolsGenuiGenerationOptions {
	widgetType: string | undefined;
	isWidgetLoading: boolean;
	hasAnyToolCalls: boolean;
	hasRunningToolCalls: boolean;
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

export function isThinkingStatusLifecycleStreaming({
	isThinkingLifecycleStreaming,
	isThinkingStatusActive,
	hasBackendThinkingActivity,
}: Readonly<ResolveThinkingStatusLifecycleStreamingOptions>): boolean {
	return (
		isThinkingLifecycleStreaming &&
		isThinkingStatusActive &&
		hasBackendThinkingActivity
	);
}

export function isPostToolsGenuiGeneration({
	widgetType,
	isWidgetLoading,
	hasAnyToolCalls,
	hasRunningToolCalls,
}: Readonly<ResolvePostToolsGenuiGenerationOptions>): boolean {
	return (
		widgetType === "genui-preview" &&
		isWidgetLoading &&
		hasAnyToolCalls &&
		!hasRunningToolCalls
	);
}
