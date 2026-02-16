"use client";

import { useState } from "react";
import ChatComposer from "@/components/blocks/chat-composer/page";

export default function ChatComposerDemo() {
	const [prompt, setPrompt] = useState("");
	const [selectedReasoning, setSelectedReasoning] = useState("deep-research");
	const [webResultsEnabled, setWebResultsEnabled] = useState(false);
	const [companyKnowledgeEnabled, setCompanyKnowledgeEnabled] = useState(true);

	return (
		<div style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
			<ChatComposer
				prompt={prompt}
				onPromptChange={setPrompt}
				onSubmit={() => setPrompt("")}
				features={{ addMenu: true, customizeMenu: true, microphone: false, disclaimer: true }}
				customizeMenuProps={{
					selectedReasoning,
					onReasoningChange: setSelectedReasoning,
					webResultsEnabled,
					onWebResultsChange: setWebResultsEnabled,
					companyKnowledgeEnabled,
					onCompanyKnowledgeChange: setCompanyKnowledgeEnabled,
				}}
			/>
		</div>
	);
}
