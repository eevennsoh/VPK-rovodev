"use client";

import type { ReactNode } from "react";
import { getAllDataParts, type RovoRenderableUIMessage } from "@/lib/rovo-ui-messages";
import type { getMessageToolParts, getThinkingToolCallSummaries } from "@/lib/rovo-ui-messages";
import {
	AdsReasoningTrigger,
	Reasoning,
	ReasoningContent,
	ReasoningSection,
	ReasoningText,
} from "@/components/ui-ai/reasoning";
import { AssistantThinkingToolsSection } from "./assistant-thinking-tools-section";
import { AssistantToolsSection } from "./assistant-tools-section";

interface AssistantThinkingStatusSectionProps {
	message: RovoRenderableUIMessage;
	label: string;
	isStreaming: boolean;
	hasReasoning: boolean;
	toolParts: ReturnType<typeof getMessageToolParts>;
	thinkingToolCalls: ReturnType<typeof getThinkingToolCallSummaries>;
}

export function AssistantThinkingStatusSection({
	message,
	label,
	isStreaming,
	hasReasoning,
	toolParts,
	thinkingToolCalls,
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

	return (
		<div className={hasReasoning ? "pt-2" : undefined}>
			<Reasoning className="mb-0" defaultOpen={hasDetails} isStreaming={isStreaming}>
				<AdsReasoningTrigger
					label={label}
					showChevron={hasDetails}
				/>
				{hasDetails ? (
					<ReasoningContent>
						<div className="space-y-4">
							{hasThinkingText ? (
								<ReasoningSection title="Thinking">
									<ReasoningText
										maxVisibleTimelineItems={6}
										text={accumulatedContent}
										timelineMode="auto"
									/>
								</ReasoningSection>
							) : null}
							{hasTools ? (
								<ReasoningSection title="Tools">
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
