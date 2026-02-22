"use client";

import { useEffect, useRef, useState } from "react";

export type ReasoningPhase = "thinking" | "streaming" | "completed" | "idle";

const THINKING_GRADIENT_COLORS = ["#1868db", "#bf63f3", "#fca700"] as const;
const MS_IN_S = 1000;
const DEFAULT_AUTO_IDLE_DELAY_MS = 3000;

interface UseReasoningPhaseOptions {
	isStreaming: boolean;
	hasMessageText: boolean;
	responseKey: string;
	autoIdle?: boolean;
	autoIdleDelayMs?: number;
}

interface UseReasoningPhaseResult {
	phase: ReasoningPhase;
	duration: number | undefined;
}

/**
 * Tracks the reasoning lifecycle through four phases:
 * thinking → streaming → completed → idle.
 *
 * Uses refs for transition tracking and deferred state updates to satisfy
 * the react-hooks/set-state-in-effect lint rule (no synchronous setState
 * inside effect bodies).
 */
export function useReasoningPhase({
	isStreaming,
	hasMessageText,
	responseKey,
	autoIdle = false,
	autoIdleDelayMs = DEFAULT_AUTO_IDLE_DELAY_MS,
}: Readonly<UseReasoningPhaseOptions>): UseReasoningPhaseResult {
	const startTimeRef = useRef<number | null>(null);
	const completedDurationRef = useRef<number | undefined>(undefined);
	const isCompletedRef = useRef(false);
	const prevStreamingRef = useRef(false);
	const prevResponseKeyRef = useRef(responseKey);

	// Single state to trigger re-renders after ref mutations
	const [, setTick] = useState(0);
	const bumpTick = () => setTick((t) => t + 1);

	// Track transitions and schedule re-renders
	useEffect(() => {
		const isNewResponse = prevResponseKeyRef.current !== responseKey;
		prevResponseKeyRef.current = responseKey;

		if (isNewResponse) {
			startTimeRef.current = isStreaming ? Date.now() : null;
			completedDurationRef.current = undefined;
			isCompletedRef.current = false;
			prevStreamingRef.current = isStreaming;
			const id = setTimeout(bumpTick, 0);
			return () => clearTimeout(id);
		}

		const wasStreaming = prevStreamingRef.current;
		prevStreamingRef.current = isStreaming;

		if (isStreaming && !wasStreaming) {
			startTimeRef.current = Date.now();
			completedDurationRef.current = undefined;
			isCompletedRef.current = false;
			const id = setTimeout(bumpTick, 0);
			return () => clearTimeout(id);
		}

		if (!isStreaming && wasStreaming) {
			const start = startTimeRef.current;
			if (start !== null) {
				completedDurationRef.current = Math.ceil(
					(Date.now() - start) / MS_IN_S
				);
				startTimeRef.current = null;
			}
			isCompletedRef.current = true;
			const id = setTimeout(bumpTick, 0);
			return () => clearTimeout(id);
		}

		return undefined;
	}, [isStreaming, responseKey]);

	// Auto-idle: dismiss completed display after a delay
	useEffect(() => {
		if (!isCompletedRef.current || !autoIdle) return;

		const timer = setTimeout(() => {
			isCompletedRef.current = false;
			bumpTick();
		}, autoIdleDelayMs);

		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- re-run when phase changes via tick
	}, [isCompletedRef.current, autoIdle, autoIdleDelayMs]);

	let phase: ReasoningPhase;
	if (isStreaming) {
		phase = hasMessageText ? "streaming" : "thinking";
	} else if (isCompletedRef.current) {
		phase = "completed";
	} else {
		phase = "idle";
	}

	return { phase, duration: completedDurationRef.current };
}

export interface ReasoningPhaseProps {
	isStreaming: boolean;
	streamingWave: boolean;
	streamingWaveGradientColor: readonly string[] | undefined;
	animatedDots: boolean;
	duration: number | undefined;
	defaultOpen: boolean | undefined;
	triggerStreaming: boolean | undefined;
}

export function getReasoningPropsForPhase(
	phase: ReasoningPhase,
	duration: number | undefined,
	hasDetails: boolean
): ReasoningPhaseProps {
	switch (phase) {
		case "thinking":
			return {
				isStreaming: true,
				streamingWave: true,
				streamingWaveGradientColor: THINKING_GRADIENT_COLORS,
				animatedDots: false,
				duration: undefined,
				defaultOpen: hasDetails ? true : undefined,
				triggerStreaming: undefined,
			};
		case "streaming":
			return {
				isStreaming: true,
				streamingWave: false,
				streamingWaveGradientColor: undefined,
				animatedDots: true,
				duration: undefined,
				defaultOpen: hasDetails ? true : undefined,
				triggerStreaming: true,
			};
		case "completed":
			return {
				isStreaming: false,
				streamingWave: false,
				streamingWaveGradientColor: undefined,
				animatedDots: false,
				duration,
				defaultOpen: false,
				triggerStreaming: undefined,
			};
		case "idle":
			return {
				isStreaming: false,
				streamingWave: false,
				streamingWaveGradientColor: undefined,
				animatedDots: false,
				duration: undefined,
				defaultOpen: undefined,
				triggerStreaming: undefined,
			};
	}
}
