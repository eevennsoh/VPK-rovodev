"use client";

import { Message, MessageContent } from "@/components/ui-ai/message";
import {
	AdsReasoningTrigger,
	Reasoning,
	ReasoningContent,
} from "@/components/ui-ai/reasoning";

interface StreamingReasoningIndicatorProps {
	label?: string;
	content?: string;
	isStreaming?: boolean;
}

const DEFAULT_REASONING_LABEL = "Thinking...";

export function StreamingReasoningIndicator({
	label = DEFAULT_REASONING_LABEL,
	content,
	isStreaming = true,
}: Readonly<StreamingReasoningIndicatorProps>): React.ReactElement {
	const normalizedLabel = label.trim() || DEFAULT_REASONING_LABEL;
	const normalizedContent = content?.trim();

	const hasContent = Boolean(normalizedContent);

	return (
		<Message from="assistant" className="max-w-full">
			<MessageContent className="px-3">
				<Reasoning className="mb-0" defaultOpen={hasContent} isStreaming={isStreaming}>
					<AdsReasoningTrigger
						label={normalizedLabel}
						showChevron={hasContent}
					/>
					{normalizedContent ? (
						<ReasoningContent>{normalizedContent}</ReasoningContent>
					) : null}
				</Reasoning>
			</MessageContent>
		</Message>
	);
}
