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

export function createMakeEntryHref(intent: MakeNavigationIntent): string {
	const params = new URLSearchParams();
	params.set("tab", "chat");
	params.set("intent", intent);
	return `/make?${params.toString()}`;
}

export function clearMakeNavigationIntentParams(
	params: URLSearchParams
): URLSearchParams {
	const nextParams = new URLSearchParams(params.toString());
	nextParams.delete("intent");
	nextParams.delete("thread");
	return nextParams;
}
