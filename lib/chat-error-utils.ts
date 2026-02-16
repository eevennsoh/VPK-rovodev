const RATE_LIMIT_PATTERN =
	/429|rate[- ]?limit|too many requests|throttl/i;

export const RATE_LIMIT_MAX_RETRIES = 2;
export const RATE_LIMIT_RETRY_DELAY_MS = 10_000;

export function isRateLimitError(rawMessage: string | undefined): boolean {
	if (!rawMessage) {
		return false;
	}

	return RATE_LIMIT_PATTERN.test(rawMessage);
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
