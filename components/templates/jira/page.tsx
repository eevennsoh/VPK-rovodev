"use client";

import { useState } from "react";
import { token } from "@/lib/tokens";
import JiraHeader from "./components/jira-header";
import BoardToolbar from "./components/board-toolbar";
import BoardColumnsContainer from "./components/board-columns-container";
import JiraWorkItemModal from "./components/jira-work-item-modal";
import { AVATARS } from "./data/avatars";

export default function JiraView() {
	const [selectedTab, setSelectedTab] = useState(1);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [selectedWorkItem, setSelectedWorkItem] = useState<{ title: string; code: string } | null>(null);

	const handleCardClick = (title: string, code: string) => {
		setSelectedWorkItem({ title, code });
		setIsModalOpen(true);
	};

	const handleModalClose = () => {
		setIsModalOpen(false);
	};

	return (
		<div style={{ height: "calc(100vh - 48px)", display: "flex", flexDirection: "column" }}>
			{/* Header Section */}
			<JiraHeader selectedTab={selectedTab} onTabChange={setSelectedTab} />

			{/* Board Tab Content */}
			{selectedTab === 1 && (
				<div
					style={{ flexGrow: 1, display: "flex", flexDirection: "column", paddingTop: token("space.200") }}
				>
					{/* Toolbar */}
					<BoardToolbar avatars={[...AVATARS]} />

					{/* Board columns */}
					<BoardColumnsContainer onCardClick={handleCardClick} />
				</div>
			)}

			{/* Work Item Modal */}
			<JiraWorkItemModal
				isOpen={isModalOpen}
				onClose={handleModalClose}
				workItemTitle={selectedWorkItem?.title}
				workItemCode={selectedWorkItem?.code}
			/>
		</div>
	);
}
