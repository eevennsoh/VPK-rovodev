const USD_FORMATTER = new Intl.NumberFormat(undefined, {
	style: "currency",
	currency: "USD",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

export function parseAgentMultiplier(value: string): number {
	const parsedValue = Number.parseInt(value, 10);
	return Number.isFinite(parsedValue) && parsedValue > 0 && parsedValue <= 4
		? parsedValue
		: 1;
}

export function formatEstimatedDuration(minutes: number): string {
	return minutes === 1 ? "~1 min" : `~${minutes} min`;
}

export function computeEstimate(
	taskCount: number,
	multiplier: number,
): { cost: string; duration: string } {
	const baseCostUsd = Math.max(0.2, taskCount * 0.17);
	const baseDurationMinutes = Math.max(1, Math.round(taskCount * 0.6));
	const scaledCostUsd = baseCostUsd * multiplier;
	const scaledDurationMinutes = Math.max(
		1,
		Math.round(baseDurationMinutes / (1 + 0.6 * (multiplier - 1))),
	);

	return {
		cost: USD_FORMATTER.format(scaledCostUsd),
		duration: formatEstimatedDuration(scaledDurationMinutes),
	};
}
