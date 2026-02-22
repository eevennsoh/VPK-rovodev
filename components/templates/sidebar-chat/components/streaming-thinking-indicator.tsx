"use client";

import type { ReactNode } from "react";
import type { getThinkingToolCallSummaries } from "@/lib/rovo-ui-messages";
import type { ReasoningPhaseProps } from "@/components/templates/shared/hooks/use-reasoning-phase";
import { Message } from "@/components/ui-ai/message";
import {
	AdsReasoningTrigger,
	Reasoning,
	ReasoningContent,
	ReasoningSection,
	ReasoningText,
} from "@/components/ui-ai/reasoning";
import { AssistantThinkingToolsSection } from "@/components/templates/shared/components/assistant-thinking-tools-section";

interface StreamingThinkingIndicatorProps {
	isStreaming: boolean;
	streamingReasoningKey: string;
	resolvedThinkingLabel: string;
	hasThinkingDetails: boolean;
	hasReasoningContent: boolean;
	trimmedReasoningContent: string;
	hasThinkingToolCalls: boolean;
	thinkingToolCalls: ReturnType<typeof getThinkingToolCallSummaries>;
	lastMessageId?: string;
	containerStyle?: React.CSSProperties;
	phaseProps: ReasoningPhaseProps;
}

export function StreamingThinkingIndicator({
	streamingReasoningKey,
	resolvedThinkingLabel,
	hasThinkingDetails,
	hasReasoningContent,
	trimmedReasoningContent,
	hasThinkingToolCalls,
	thinkingToolCalls,
	lastMessageId,
	containerStyle,
	phaseProps,
}: Readonly<StreamingThinkingIndicatorProps>): ReactNode {
	return (
		<div style={containerStyle}>
			<Message from="assistant" className="max-w-full">
				<Reasoning
					key={streamingReasoningKey}
					className="mb-0"
					isStreaming={phaseProps.isStreaming}
					streamingWave={phaseProps.streamingWave}
					streamingWaveGradientColor={
						phaseProps.streamingWaveGradientColor
					}
					animatedDots={phaseProps.animatedDots}
					duration={phaseProps.duration}
					defaultOpen={phaseProps.defaultOpen ?? hasThinkingDetails}
				>
					<AdsReasoningTrigger
						label={resolvedThinkingLabel}
						showChevron={hasThinkingDetails}
						streaming={phaseProps.triggerStreaming}
					/>
					{hasThinkingDetails ? (
						<ReasoningContent>
							<div className="space-y-4">
								{hasReasoningContent ? (
									<ReasoningSection title="Thinking">
										<ReasoningText
											maxVisibleTimelineItems={6}
											text={trimmedReasoningContent}
											timelineMode="auto"
										/>
									</ReasoningSection>
								) : null}
								{hasThinkingToolCalls ? (
									<ReasoningSection title="Tools">
										<AssistantThinkingToolsSection
											defaultOpenMode="running"
											idPrefix={lastMessageId ?? "stream"}
											thinkingToolCalls={thinkingToolCalls}
										/>
									</ReasoningSection>
								) : null}
							</div>
						</ReasoningContent>
					) : null}
				</Reasoning>
			</Message>
		</div>
	);
}
