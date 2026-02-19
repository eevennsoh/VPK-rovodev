const RATE_LIMIT_PATTERN =
	/429|rate[- ]?limit|too many requests|throttl/i;
const CHAT_IN_PROGRESS_PATTERN =
	/status\s*409|chat(?: already)? in progress|chat-turn wait timed out|ROVODEV_CHAT_IN_PROGRESS_TIMEOUT/i;

export const RATE_LIMIT_MAX_RETRIES = 2;
export const RATE_LIMIT_RETRY_DELAY_MS = 10_000;
export const CHAT_IN_PROGRESS_MAX_RETRIES = 1;
export const CHAT_IN_PROGRESS_RETRY_DELAY_MS = 10_000;

export function isRateLimitError(rawMessage: string | undefined): boolean {
	if (!rawMessage) {
		return false;
	}

	return RATE_LIMIT_PATTERN.test(rawMessage);
}

export function isChatInProgressError(rawMessage: string | undefined): boolean {
	if (!rawMessage) {
		return false;
	}

	return CHAT_IN_PROGRESS_PATTERN.test(rawMessage);
}

function formatSeconds(seconds: number): string {
	return `${seconds} second${seconds === 1 ? "" : "s"}`;
}

export function getRateLimitRetryCountdownMessage(
	secondsRemaining: number
): string {
	const safeSeconds = Math.max(1, Math.ceil(secondsRemaining));
	return `I'm experiencing high demand right now. Retrying automatically in ${formatSeconds(safeSeconds)}...`;
}

export function getRateLimitUserMessage(retryAttempt: number): string {
	if (retryAttempt < RATE_LIMIT_MAX_RETRIES) {
		return getRateLimitRetryCountdownMessage(
			Math.ceil(RATE_LIMIT_RETRY_DELAY_MS / 1000)
		);
	}

	return "I'm experiencing high demand right now. Please wait a moment and try again.";
}

export function getChatInProgressRetryCountdownLabel(
	secondsRemaining: number
): string {
	const safeSeconds = Math.max(1, Math.ceil(secondsRemaining));
	return `Retrying in ${formatSeconds(safeSeconds)}`;
}

export function getChatInProgressUserMessage(retryAttempt: number): string {
	if (retryAttempt < CHAT_IN_PROGRESS_MAX_RETRIES) {
		return `The previous chat is still finishing. ${getChatInProgressRetryCountdownLabel(
			Math.ceil(CHAT_IN_PROGRESS_RETRY_DELAY_MS / 1000)
		)}.`;
	}

	return "The previous chat is still finishing. Please wait a moment and try again.";
}
