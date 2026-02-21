"use client";

import { use, type ReactNode } from "react";
import {
	AdsReasoningTrigger,
	Reasoning,
	ReasoningContent,
	ReasoningSection,
	ReasoningText,
} from "@/components/ui-ai/reasoning";
import { ThreadMessageContext } from "./thread-message-context";
import { AssistantThinkingToolsSection } from "../components/assistant-thinking-tools-section";
import { AssistantToolsSection } from "../components/assistant-tools-section";

export function ThreadMessageThinkingStatus(): ReactNode {
	const {
		message,
		reasoning,
		isStreaming,
		isThinkingStatusActive,
		thinkingStatusPart,
		allThinkingStatusParts,
		resolvedThinkingStatusLabel,
		toolParts,
		thinkingToolCallsForStatus,
	} = use(ThreadMessageContext)!;

	if (!isThinkingStatusActive || !thinkingStatusPart) {
		return null;
	}

	const accumulatedContent = allThinkingStatusParts
		.map((part) => part.data.content)
		.filter(Boolean)
		.join("\n\n");
	const hasThinkingText = Boolean(accumulatedContent);
	const hasToolParts = toolParts.length > 0;
	const hasThinkingToolCalls = thinkingToolCallsForStatus.length > 0;
	const hasTools = hasToolParts || hasThinkingToolCalls;
	const hasDetails = hasThinkingText || hasTools;

	return (
		<div className={reasoning ? "pt-2" : undefined}>
			<Reasoning
				className="mb-0"
				defaultOpen={hasDetails}
				isStreaming={isStreaming}
			>
				<AdsReasoningTrigger
					label={resolvedThinkingStatusLabel}
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
											thinkingToolCalls={thinkingToolCallsForStatus}
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
