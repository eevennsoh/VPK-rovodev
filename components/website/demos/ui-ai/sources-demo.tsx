import { Sources, SourcesTrigger, SourcesContent, Source } from "@/components/ui-ai/sources";

export default function SourcesDemo() {
	return (
		<Sources>
			<SourcesTrigger count={3} />
			<SourcesContent>
				<Source href="#" title="React Documentation" />
				<Source href="#" title="MDN Web Docs" />
				<Source href="#" title="TypeScript Handbook" />
			</SourcesContent>
		</Sources>
	);
}
