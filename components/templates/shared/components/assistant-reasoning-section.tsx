import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from "@/components/ui-ai/reasoning";

interface AssistantReasoningSectionProps {
	reasoning: { text: string; isStreaming: boolean };
}

export function AssistantReasoningSection({
	reasoning,
}: Readonly<AssistantReasoningSectionProps>): React.ReactElement {
	return (
		<Reasoning
			className="px-3 pt-2"
			defaultOpen={false}
			isStreaming={reasoning.isStreaming}
		>
			<ReasoningTrigger />
			<ReasoningContent>{reasoning.text}</ReasoningContent>
		</Reasoning>
	);
}
