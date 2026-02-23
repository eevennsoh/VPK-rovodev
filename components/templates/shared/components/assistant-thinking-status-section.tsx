"use client";

import type { ReactNode } from "react";
import { getAllDataParts, type RovoRenderableUIMessage } from "@/lib/rovo-ui-messages";
import type { getMessageToolParts, getThinkingToolCallSummaries } from "@/lib/rovo-ui-messages";
import {
	type ReasoningPhase,
	getReasoningPropsForPhase,
} from "@/components/templates/shared/hooks/use-reasoning-phase";
import {
	AdsReasoningTrigger,
	Reasoning,
	ReasoningContent,
	ReasoningSection,
	ReasoningText,
} from "@/components/ui-ai/reasoning";
import { AssistantThinkingToolsSection } from "./assistant-thinking-tools-section";
import { AssistantToolsSection } from "./assistant-tools-section";
import { getReasoningSectionTitle } from "@/components/templates/shared/lib/reasoning-labels";

interface AssistantThinkingStatusSectionProps {
	message: RovoRenderableUIMessage;
	label: string;
	isStreaming: boolean;
	toolParts: ReturnType<typeof getMessageToolParts>;
	thinkingToolCalls: ReturnType<typeof getThinkingToolCallSummaries>;
	reasoningPhase?: ReasoningPhase;
}

function resolveCompletedThinkingDurationSeconds(
	message: RovoRenderableUIMessage
): number | undefined {
	const timestamps = getAllDataParts(message, "data-thinking-event")
		.map((part) => Date.parse(part.data.timestamp))
		.filter((value) => Number.isFinite(value));
	if (timestamps.length === 0) {
		return undefined;
	}

	const startedAt = Math.min(...timestamps);
	const endedAt = Math.max(...timestamps);
	return Math.max(1, Math.ceil((endedAt - startedAt) / 1000));
}

export function AssistantThinkingStatusSection({
	message,
	label,
	isStreaming,
	toolParts,
	thinkingToolCalls,
	reasoningPhase,
}: Readonly<AssistantThinkingStatusSectionProps>): ReactNode {
	const accumulatedContent = getAllDataParts(message, "data-thinking-status")
		.map((part) => part.data.content)
		.filter(Boolean)
		.join("\n\n");
	const hasThinkingText = Boolean(accumulatedContent);
	const hasToolParts = toolParts.length > 0;
	const hasThinkingToolCalls = thinkingToolCalls.length > 0;
	const hasTools = hasToolParts || hasThinkingToolCalls;
	const hasDetails = hasThinkingText || hasTools;

	const resolvedPhase = reasoningPhase ?? (isStreaming ? "thinking" : "completed");
	const phaseProps = getReasoningPropsForPhase(resolvedPhase, undefined, hasDetails);
	const completedDuration =
		resolvedPhase === "completed"
			? resolveCompletedThinkingDurationSeconds(message)
			: undefined;

	return (
		<div>
			<Reasoning
				className="mb-0"
				autoExpandOnDetails
				hasDetails={hasDetails}
				defaultOpen={phaseProps.defaultOpen ?? hasDetails}
				isStreaming={phaseProps.isStreaming}
				streamingWave={phaseProps.streamingWave}
				streamingWaveGradientColor={phaseProps.streamingWaveGradientColor}
				animatedDots={phaseProps.animatedDots}
				duration={completedDuration}
			>
				<AdsReasoningTrigger
					label={label}
					showChevron={hasDetails}
					streaming={phaseProps.triggerStreaming}
				/>
				{hasDetails ? (
					<ReasoningContent>
						<div className="space-y-4">
							{hasThinkingText ? (
								<ReasoningSection title={getReasoningSectionTitle("thinking")}>
									<ReasoningText
										maxVisibleTimelineItems={6}
										text={accumulatedContent}
										timelineMode="auto"
									/>
								</ReasoningSection>
							) : null}
							{hasTools ? (
								<ReasoningSection title={getReasoningSectionTitle("tools")}>
									{hasToolParts ? (
										<div className="-mx-6">
											<AssistantToolsSection
												messageId={message.id}
												toolParts={toolParts}
												defaultOpenMode="running"
											/>
										</div>
									) : null}
									{hasThinkingToolCalls ? (
										<AssistantThinkingToolsSection
											className="pt-1"
											defaultOpenMode="running"
											idPrefix={message.id}
											thinkingToolCalls={thinkingToolCalls}
										/>
									) : null}
								</ReasoningSection>
							) : null}
						</div>
					</ReasoningContent>
				) : null}
			</Reasoning>
		</div>
	);
}
