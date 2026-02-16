"use client";

import RovoChatInput from "./components/rovo-chat-input";
import RovoChatMessages from "./components/rovo-chat-messages";
import RovoViewHeader from "./components/rovo-view-header";
import RovoInitialView from "./components/rovo-initial-view";
import { useRovoViewChat } from "./hooks/use-rovo-view-chat";
import { useScrollAnchoring } from "@/components/templates/shared/hooks/use-scroll-anchoring";
import { CONTAINER_STYLES } from "./data/container-styles";
import styles from "./rovo.module.css";

export default function RovoView() {
	const {
		prompt,
		setPrompt,
		isChatMode,
		uiMessages,
		userName,
		isListening,
		interimText,
		toggleDictation,
		contextEnabled,
		setContextEnabled,
		selectedReasoning,
		setSelectedReasoning,
		webResultsEnabled,
		setWebResultsEnabled,
		companyKnowledgeEnabled,
		setCompanyKnowledgeEnabled,
		handleSubmit,
		handleSuggestedQuestionClick,
		handleBackToStart,
		isStreaming,
	} = useRovoViewChat();

	const { conversationContextRef, scrollSpacerRef } = useScrollAnchoring({
		uiMessages,
		enabled: isChatMode,
	});

	return (
		<div style={isChatMode ? CONTAINER_STYLES.chatMode : CONTAINER_STYLES.initial}>
			<RovoViewHeader isChatMode={isChatMode} onBackToStart={handleBackToStart} />

			{!isChatMode ? (
				<RovoInitialView
					userName={userName}
					prompt={prompt}
					interimText={interimText}
					isListening={isListening}
					onPromptChange={setPrompt}
					onSubmit={handleSubmit}
					onToggleDictation={toggleDictation}
					contextEnabled={contextEnabled}
					onContextToggle={setContextEnabled}
					selectedReasoning={selectedReasoning}
					onReasoningChange={setSelectedReasoning}
					webResultsEnabled={webResultsEnabled}
					onWebResultsChange={setWebResultsEnabled}
					companyKnowledgeEnabled={companyKnowledgeEnabled}
					onCompanyKnowledgeChange={setCompanyKnowledgeEnabled}
				/>
			) : (
				<>
					<div
						className={styles.rovoViewChat}
						style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", alignItems: "center" }}
					>
						<div style={{ flex: 1, width: "100%", maxWidth: "768px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
							<RovoChatMessages
								uiMessages={uiMessages}
								variant="sidepanel"
								messageMode="ask"
								onSuggestedQuestionClick={handleSuggestedQuestionClick}
								userName={userName ?? undefined}
								conversationContextRef={conversationContextRef}
								scrollSpacerRef={scrollSpacerRef}
								isStreaming={isStreaming}
							/>
						</div>
					</div>

					<div style={{ flexShrink: 0, maxWidth: "800px", width: "100%", margin: "0 auto" }}>
						<RovoChatInput
							prompt={prompt}
							interimText={interimText}
							isListening={isListening}
							onPromptChange={setPrompt}
							onSubmit={handleSubmit}
							onToggleDictation={toggleDictation}
							contextEnabled={contextEnabled}
							onContextToggle={setContextEnabled}
							product="rovo"
							selectedReasoning={selectedReasoning}
							onReasoningChange={setSelectedReasoning}
							webResultsEnabled={webResultsEnabled}
							onWebResultsChange={setWebResultsEnabled}
							companyKnowledgeEnabled={companyKnowledgeEnabled}
							onCompanyKnowledgeChange={setCompanyKnowledgeEnabled}
						/>
					</div>
				</>
			)}
		</div>
	);
}
