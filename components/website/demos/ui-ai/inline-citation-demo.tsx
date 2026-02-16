import {
	InlineCitation,
	InlineCitationText,
	InlineCitationCard,
	InlineCitationCardTrigger,
} from "@/components/ui-ai/inline-citation";

export default function InlineCitationDemo() {
	return (
		<InlineCitation>
			<InlineCitationText>React uses a virtual DOM</InlineCitationText>
			<InlineCitationCard>
				<InlineCitationCardTrigger sources={["https://react.dev", "https://developer.mozilla.org"]} />
			</InlineCitationCard>
		</InlineCitation>
	);
}
