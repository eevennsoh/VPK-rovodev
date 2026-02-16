import { Snippet, SnippetInput, SnippetCopyButton } from "@/components/ui-ai/snippet";

export default function SnippetDemo() {
	return (
		<Snippet code="npm install ai" className="w-full">
			<SnippetInput />
			<SnippetCopyButton />
		</Snippet>
	);
}
