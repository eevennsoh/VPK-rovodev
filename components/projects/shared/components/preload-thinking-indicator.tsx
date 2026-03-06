"use client";

import type { ReactNode } from "react";
import { Message } from "@/components/ui-ai/message";
import { AdsReasoningTrigger, Reasoning } from "@/components/ui-ai/reasoning";
import { getReasoningPropsForPhase } from "@/components/projects/shared/hooks/use-reasoning-phase";
import { getPreloadShimmerLabel } from "@/components/projects/shared/lib/reasoning-labels";

interface PreloadThinkingIndicatorProps {
	label?: string;
}

export function PreloadThinkingIndicator({
	label = getPreloadShimmerLabel(),
}: Readonly<PreloadThinkingIndicatorProps>): ReactNode {
	const preloadPhaseProps = getReasoningPropsForPhase("preload", undefined, false);

	return (
		<Message from="assistant" className="max-w-full">
			<Reasoning
				className="mb-0"
				defaultOpen={false}
				isStreaming={preloadPhaseProps.isStreaming}
				streamingWave={preloadPhaseProps.streamingWave}
				streamingWaveGradientColor={preloadPhaseProps.streamingWaveGradientColor}
				animatedDots={preloadPhaseProps.animatedDots}
			>
				<AdsReasoningTrigger
					label={label}
					showChevron={false}
					streaming={preloadPhaseProps.triggerStreaming}
				/>
			</Reasoning>
		</Message>
	);
}
