import { Suggestion } from "@/components/ui-ai/suggestion";
import AiChatIcon from "@atlaskit/icon/core/ai-chat";

interface AssistantSuggestionsSectionProps {
	messageId: string;
	suggestedQuestions: string[];
	onSuggestionClick?: (question: string) => void;
}

export function AssistantSuggestionsSection({
	messageId,
	suggestedQuestions,
	onSuggestionClick,
}: Readonly<AssistantSuggestionsSectionProps>): React.ReactElement {
	return (
		<div className="flex flex-col items-end gap-2 py-4">
			{suggestedQuestions.map((question, index) => (
				<Suggestion
					key={`${messageId}-suggestion-${question}-${index}`}
					className="gap-2 !rounded-[min(var(--radius-md),12px)]"
					onClick={onSuggestionClick}
					suggestion={question}
					variant="outline"
				>
					<AiChatIcon label="" size="small" />
					<span className="font-medium">{question}</span>
				</Suggestion>
			))}
		</div>
	);
}
