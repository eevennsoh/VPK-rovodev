export type MakeNavigationIntent = "fresh-chat" | "fresh-make";

function isMakeNavigationIntent(value: string): value is MakeNavigationIntent {
	return value === "fresh-chat" || value === "fresh-make";
}

export function parseMakeNavigationIntent(
	params: URLSearchParams
): MakeNavigationIntent | null {
	const intent = params.get("intent");
	if (!intent || !isMakeNavigationIntent(intent)) {
		return null;
	}

	return intent;
}

export function parseMakeNavigationPrompt(
	params: URLSearchParams
): string | null {
	const prompt = params.get("prompt");
	return prompt && prompt.trim() ? prompt.trim() : null;
}

export function createMakeEntryHref(
	intent: MakeNavigationIntent,
	prompt?: string,
): string {
	const params = new URLSearchParams();
	params.set("intent", intent);
	if (prompt) {
		params.set("prompt", prompt);
	}
	return `/make?${params.toString()}`;
}

export function clearMakeNavigationIntentParams(
	params: URLSearchParams
): URLSearchParams {
	const nextParams = new URLSearchParams(params.toString());
	nextParams.delete("intent");
	nextParams.delete("prompt");
	nextParams.delete("thread");
	return nextParams;
}
