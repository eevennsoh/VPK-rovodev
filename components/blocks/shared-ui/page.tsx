"use client";

import { useState } from "react";
import { token } from "@/lib/tokens";
import Heading from "./heading";
import CustomizeMenu from "./customize-menu";

export default function SharedUiAdsPage() {
	const [selectedReasoning, setSelectedReasoning] = useState("let-rovo-decide");
	const [webResultsEnabled, setWebResultsEnabled] = useState(true);
	const [companyKnowledgeEnabled, setCompanyKnowledgeEnabled] = useState(true);

	return (
		<div
			style={{
				minHeight: "100vh",
				backgroundColor: token("color.background.neutral.subtle"),
				padding: token("space.300"),
			}}
		>
			<div
				style={{
					maxWidth: 460,
					margin: "0 auto",
					backgroundColor: token("elevation.surface"),
					border: `1px solid ${token("color.border")}`,
					borderRadius: token("radius.large"),
					padding: token("space.250"),
				}}
			>
				<Heading as="h2" size="small">
					Shared UI (ADS)
				</Heading>
				<p
					style={{
						marginTop: token("space.100"),
						marginBottom: token("space.200"),
						color: token("color.text.subtle"),
						font: token("font.body"),
					}}
				>
					Common ADS utilities used across templates.
				</p>

				<CustomizeMenu
					selectedReasoning={selectedReasoning}
					onReasoningChange={setSelectedReasoning}
					webResultsEnabled={webResultsEnabled}
					onWebResultsChange={setWebResultsEnabled}
					companyKnowledgeEnabled={companyKnowledgeEnabled}
					onCompanyKnowledgeChange={setCompanyKnowledgeEnabled}
					onClose={() => {}}
				/>
			</div>
		</div>
	);
}
