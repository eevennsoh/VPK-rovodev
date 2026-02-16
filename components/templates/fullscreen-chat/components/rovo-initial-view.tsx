"use client";

import { useState } from "react";
import { token } from "@/lib/tokens";
import Image from "next/image";
import Heading from "@/components/blocks/shared-ui/heading";
import PromptGallery from "@/components/blocks/prompt-gallery/page";
import RovoChatInput from "./rovo-chat-input";

const DEFAULT_ROVO_PLACEHOLDER = "Write a prompt, @someone, or use / for actions";

interface RovoInitialViewProps {
	userName: string | null;
	prompt: string;
	interimText: string;
	isListening: boolean;
	onPromptChange: (value: string) => void;
	onSubmit: () => void;
	onToggleDictation: () => void;
	contextEnabled: boolean;
	onContextToggle: (enabled: boolean) => void;
	selectedReasoning: string;
	onReasoningChange: (value: string) => void;
	webResultsEnabled: boolean;
	onWebResultsChange: (enabled: boolean) => void;
	companyKnowledgeEnabled: boolean;
	onCompanyKnowledgeChange: (enabled: boolean) => void;
}

export default function RovoInitialView({
	userName,
	prompt,
	interimText,
	isListening,
	onPromptChange,
	onSubmit,
	onToggleDictation,
	contextEnabled,
	onContextToggle,
	selectedReasoning,
	onReasoningChange,
	webResultsEnabled,
	onWebResultsChange,
	companyKnowledgeEnabled,
	onCompanyKnowledgeChange,
}: Readonly<RovoInitialViewProps>) {
	const [previewPrompt, setPreviewPrompt] = useState<string | null>(null);

	return (
		<>
			<div style={{ width: "800px", maxWidth: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: token("space.100") }}>
				<div>
					<Image src="/illustration-ai/chat/light.svg" alt="Rovo Chat" width={74} height={67} />
				</div>

				<div style={{ marginBottom: token("space.400") }}>
					<Heading size="xlarge">
						{userName ? `How can I help, ${userName}?` : "How can I help?"}
					</Heading>
				</div>

				<div style={{ width: "100%", padding: `0 ${token("space.200")}` }}>
					<RovoChatInput
						prompt={prompt}
						interimText={interimText}
						isListening={isListening}
						onPromptChange={onPromptChange}
						onSubmit={onSubmit}
						onToggleDictation={onToggleDictation}
						contextEnabled={contextEnabled}
						onContextToggle={onContextToggle}
						product="rovo"
						selectedReasoning={selectedReasoning}
						onReasoningChange={onReasoningChange}
						webResultsEnabled={webResultsEnabled}
						onWebResultsChange={onWebResultsChange}
						companyKnowledgeEnabled={companyKnowledgeEnabled}
						onCompanyKnowledgeChange={onCompanyKnowledgeChange}
						customHeight="131px"
						hideUsesAI={true}
						placeholder={previewPrompt ?? DEFAULT_ROVO_PLACEHOLDER}
					/>
				</div>

				<div
					style={{
						width: "100%",
						padding: `0 ${token("space.300")}`,
						marginTop: token("space.300"),
					}}
				>
					<PromptGallery
						onSelect={(selectedPrompt) => onPromptChange(selectedPrompt)}
						onPreviewStart={setPreviewPrompt}
						onPreviewEnd={() => setPreviewPrompt(null)}
					/>
				</div>
			</div>

			<div
				style={{
					position: "fixed",
					bottom: token("space.300"),
					left: "50%",
					transform: "translateX(-50%)",
					textAlign: "center",
				}}
			>
				<span className="text-xs text-text-subtlest">
					Uses AI. Verify results.
				</span>
			</div>
		</>
	);
}
