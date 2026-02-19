"use client";

import ReasoningSection from "./reasoning-section";
import { SourcesSection } from "./sources-settings-sections";

interface CustomizeMenuProps {
	selectedReasoning: string;
	onReasoningChange: (reasoning: string) => void;
	webResultsEnabled: boolean;
	onWebResultsChange: (enabled: boolean) => void;
	companyKnowledgeEnabled: boolean;
	onCompanyKnowledgeChange: (enabled: boolean) => void;
	onClose: () => void;
}

export default function CustomizeMenu({
	selectedReasoning,
	onReasoningChange,
	webResultsEnabled,
	onWebResultsChange,
	companyKnowledgeEnabled,
	onCompanyKnowledgeChange,
	onClose,
}: Readonly<CustomizeMenuProps>) {
	return (
		<>
			<ReasoningSection
				selectedReasoning={selectedReasoning}
				onReasoningChange={onReasoningChange}
				onClose={onClose}
			/>
			<SourcesSection
				webResultsEnabled={webResultsEnabled}
				onWebResultsChange={onWebResultsChange}
				companyKnowledgeEnabled={companyKnowledgeEnabled}
				onCompanyKnowledgeChange={onCompanyKnowledgeChange}
				onClose={onClose}
			/>
		</>
	);
}
