"use client";

import { tool } from "ai";
import { z } from "zod";
import {
	Agent,
	AgentContent,
	AgentHeader,
	AgentInstructions,
	AgentOutput,
	AgentTool,
	AgentTools,
} from "@/components/ui-ai/agent";

const webSearch = tool({
	description: "Search the web for information",
	inputSchema: z.object({
		query: z.string().describe("The search query"),
	}),
});

const readUrl = tool({
	description: "Read and parse content from a URL",
	inputSchema: z.object({
		url: z.string().describe("The URL to read"),
	}),
});

const outputSchema = `z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  score: z.number(),
  summary: z.string(),
})`;

export default function AgentDemo() {
	return (
		<Agent className="w-full">
			<AgentHeader
				name="Sentiment Analyzer"
				model="anthropic/claude-sonnet-4-5"
			/>
			<AgentContent>
				<AgentInstructions>
					Analyze the sentiment of the provided text and return a structured
					analysis with sentiment classification, confidence score, and summary.
				</AgentInstructions>
				<AgentTools multiple>
					<AgentTool tool={webSearch} value="web_search" />
					<AgentTool tool={readUrl} value="read_url" />
				</AgentTools>
				<AgentOutput schema={outputSchema} />
			</AgentContent>
		</Agent>
	);
}
