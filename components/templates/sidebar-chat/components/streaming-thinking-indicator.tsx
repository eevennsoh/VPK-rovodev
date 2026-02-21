"use client";

import type { ReactNode } from "react";
import type { getThinkingToolCallSummaries } from "@/lib/rovo-ui-messages";
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
}

export function StreamingThinkingIndicator({
	isStreaming,
	streamingReasoningKey,
	resolvedThinkingLabel,
	hasThinkingDetails,
	hasReasoningContent,
	trimmedReasoningContent,
	hasThinkingToolCalls,
	thinkingToolCalls,
	lastMessageId,
	containerStyle,
}: Readonly<StreamingThinkingIndicatorProps>): ReactNode {
	return (
		<div style={containerStyle}>
			<Message from="assistant" className="max-w-full">
				<Reasoning
					key={streamingReasoningKey}
					className="mb-0"
					isStreaming={isStreaming}
				>
					<AdsReasoningTrigger
						label={resolvedThinkingLabel}
						showChevron={hasThinkingDetails}
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
