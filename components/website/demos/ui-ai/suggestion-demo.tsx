import { Suggestions, Suggestion } from "@/components/ui-ai/suggestion";
import AiChatIcon from "@atlaskit/icon/core/ai-chat";

export default function SuggestionDemo() {
	return (
		<Suggestions>
			<Suggestion suggestion="Tell me a joke" />
			<Suggestion suggestion="Explain AI" />
			<Suggestion suggestion="Write code" />
		</Suggestions>
	);
}

export function SuggestionDemoVertical() {
	return (
		<Suggestions orientation="vertical">
			<Suggestion
				className="gap-2 !rounded-[min(var(--radius-md),12px)]"
				suggestion="How do I set up a new project?"
			>
				<AiChatIcon label="" size="small" />
				<span className="font-medium">How do I set up a new project?</span>
			</Suggestion>
			<Suggestion
				className="gap-2 !rounded-[min(var(--radius-md),12px)]"
				suggestion="Explain the architecture"
			>
				<AiChatIcon label="" size="small" />
				<span className="font-medium">Explain the architecture</span>
			</Suggestion>
			<Suggestion
				className="gap-2 !rounded-[min(var(--radius-md),12px)]"
				suggestion="Help me debug this issue"
			>
				<AiChatIcon label="" size="small" />
				<span className="font-medium">Help me debug this issue</span>
			</Suggestion>
		</Suggestions>
	);
}

export function SuggestionDemoWithIcons() {
	return (
		<Suggestions>
			<Suggestion suggestion="Find information" variant="secondary" className="gap-2">
				<AiChatIcon label="" size="small" />
				Find information
			</Suggestion>
			<Suggestion suggestion="Measure productivity" variant="secondary" className="gap-2">
				<AiChatIcon label="" size="small" />
				Measure productivity
			</Suggestion>
			<Suggestion suggestion="Find People" variant="secondary" className="gap-2">
				<AiChatIcon label="" size="small" />
				Find People
			</Suggestion>
		</Suggestions>
	);
}
