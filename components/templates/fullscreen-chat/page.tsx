"use client";

import { useCallback, useMemo, useState } from "react";
import RovoChatInput from "./components/rovo-chat-input";
import RovoChatMessages from "./components/rovo-chat-messages";
import RovoViewHeader from "./components/rovo-view-header";
import RovoInitialView from "./components/rovo-initial-view";
import { useRovoViewChat } from "./hooks/use-rovo-view-chat";
import { useScrollAnchoring } from "@/components/templates/shared/hooks/use-scroll-anchoring";
import { ClarificationQuestionCard } from "@/components/templates/shared/components/clarification-question-card";
import { QuestionCardShortcutsFooter } from "@/components/templates/shared/components/question-card-shortcuts-footer";
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
		handleClarificationSubmit,
		webResultsEnabled,
		setWebResultsEnabled,
		companyKnowledgeEnabled,
		setCompanyKnowledgeEnabled,
		queuedPrompts,
		removeQueuedPrompt,
		activeQuestionCard,
		handleSubmit,
		handleSuggestedQuestionClick,
		handleBackToStart,
		isStreaming,
		isSubmitPending,
		stopStreaming,
	} = useRovoViewChat();
	const isRequestInFlight = isStreaming || isSubmitPending;

	const { conversationContextRef, scrollSpacerRef } = useScrollAnchoring({
		uiMessages,
		enabled: isChatMode,
	});
	const activeQuestionCardKey = useMemo(
		() => (activeQuestionCard ? `${activeQuestionCard.sessionId}-${activeQuestionCard.round}` : null),
		[activeQuestionCard]
	);
	const [dismissedQuestionCardKey, setDismissedQuestionCardKey] = useState<string | null>(null);
	const shouldShowQuestionCard = !isRequestInFlight && activeQuestionCard !== null && dismissedQuestionCardKey !== activeQuestionCardKey;
	const dismissQuestionCard = useCallback(() => {
		if (!activeQuestionCardKey) {
			return;
		}
		setDismissedQuestionCardKey(activeQuestionCardKey);
	}, [activeQuestionCardKey]);

	return (
		<div style={isChatMode ? CONTAINER_STYLES.chatMode : CONTAINER_STYLES.initial}>
			<RovoViewHeader isChatMode={isChatMode} onBackToStart={handleBackToStart} />

			{!isChatMode ? (
				<RovoInitialView
					userName={userName}
					prompt={prompt}
					interimText={interimText}
					isListening={isListening}
					isStreaming={isRequestInFlight}
					onPromptChange={setPrompt}
					onSubmit={handleSubmit}
					onToggleDictation={toggleDictation}
					onStopStreaming={stopStreaming}
					contextEnabled={contextEnabled}
					onContextToggle={setContextEnabled}
					selectedReasoning={selectedReasoning}
					onReasoningChange={setSelectedReasoning}
					webResultsEnabled={webResultsEnabled}
					onWebResultsChange={setWebResultsEnabled}
					companyKnowledgeEnabled={companyKnowledgeEnabled}
					onCompanyKnowledgeChange={setCompanyKnowledgeEnabled}
					queuedPrompts={queuedPrompts}
					onRemoveQueuedPrompt={removeQueuedPrompt}
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
									enableSmartWidgets={true}
									onSuggestedQuestionClick={handleSuggestedQuestionClick}
									userName={userName ?? undefined}
									conversationContextRef={conversationContextRef}
									scrollSpacerRef={scrollSpacerRef}
									isStreaming={isStreaming}
									isSubmitPending={isSubmitPending}
								/>
						</div>
					</div>

					<div style={{ flexShrink: 0, maxWidth: "800px", width: "100%", margin: "0 auto" }}>
						{shouldShowQuestionCard && activeQuestionCard ? (
							<div style={{ padding: "0 12px" }}>
								<ClarificationQuestionCard
									key={activeQuestionCardKey ?? undefined}
									questionCard={activeQuestionCard}
									onSubmit={(answers) => {
										void handleClarificationSubmit(answers);
										dismissQuestionCard();
									}}
									onDismiss={dismissQuestionCard}
								/>
								<QuestionCardShortcutsFooter />
							</div>
						) : (
							<RovoChatInput
								prompt={prompt}
								interimText={interimText}
								isListening={isListening}
								isStreaming={isRequestInFlight}
								onPromptChange={setPrompt}
								onSubmit={handleSubmit}
								onToggleDictation={toggleDictation}
								onStopStreaming={stopStreaming}
								contextEnabled={contextEnabled}
								onContextToggle={setContextEnabled}
								product="rovo"
								selectedReasoning={selectedReasoning}
								onReasoningChange={setSelectedReasoning}
								webResultsEnabled={webResultsEnabled}
								onWebResultsChange={setWebResultsEnabled}
								companyKnowledgeEnabled={companyKnowledgeEnabled}
								onCompanyKnowledgeChange={setCompanyKnowledgeEnabled}
								queuedPrompts={queuedPrompts}
								onRemoveQueuedPrompt={removeQueuedPrompt}
							/>
						)}
					</div>
				</>
			)}
		</div>
	);
}
