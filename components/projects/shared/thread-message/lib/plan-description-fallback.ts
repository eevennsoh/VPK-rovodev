import {
	type ParsedPlanWidgetPayload,
	generateMermaidFromPlanTasks,
} from "@/components/projects/shared/lib/plan-widget";
import { extractPlanRenderableText } from "@/components/projects/shared/lib/message-text-utils";

interface BuildPlanDescriptionFallbackOptions {
	messageText: string;
	planPayload: ParsedPlanWidgetPayload;
}

export function buildPlanDescriptionFallback({
	messageText,
	planPayload,
}: BuildPlanDescriptionFallbackOptions): string {
	const planRenderableText = extractPlanRenderableText(messageText, {
		summaryMode: "full",
	});
	const narrativeSummary = planRenderableText.summary.trim();
	let dependencyMermaid = planRenderableText.mermaid.trim();
	let usesInferredLinearEdges = false;

	if (!dependencyMermaid && planPayload.tasks.length > 0) {
		const generatedGraph = generateMermaidFromPlanTasks(planPayload.tasks);
		dependencyMermaid = generatedGraph.markdown.trim();
		usesInferredLinearEdges = generatedGraph.usesInferredLinearEdges;
	}

	const sections: string[] = [];
	if (narrativeSummary) {
		sections.push(narrativeSummary);
	}

	if (dependencyMermaid) {
		const dependencySection: string[] = ["### Task dependency graph"];
		if (usesInferredLinearEdges) {
			dependencySection.push(
				"_Inferred order: tasks are shown in a simple linear sequence._"
			);
		}
		dependencySection.push(dependencyMermaid);
		sections.push(dependencySection.join("\n\n"));
	}

	return sections.join("\n\n").trim();
}
