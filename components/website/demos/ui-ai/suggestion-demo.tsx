import { Suggestions, Suggestion } from "@/components/ui-ai/suggestion";

export default function SuggestionDemo() {
	return (
		<Suggestions>
			<Suggestion suggestion="Tell me a joke" />
			<Suggestion suggestion="Explain AI" />
			<Suggestion suggestion="Write code" />
		</Suggestions>
	);
}
