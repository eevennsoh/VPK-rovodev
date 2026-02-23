"use client";

import RovoChatInput from "./components/rovo-chat-input";
import RovoChatMessages from "./components/rovo-chat-messages";
import RovoViewHeader from "./components/rovo-view-header";
import RovoInitialView from "./components/rovo-initial-view";
import { useRovoViewChat } from "./hooks/use-rovo-view-chat";
import { useScrollAnchoring } from "@/components/templates/shared/hooks/use-scroll-anchoring";
import { ClarificationQuestionCard } from "@/components/templates/shared/components/clarification-question-card";
import { QuestionCardShortcutsFooter } from "@/components/templates/shared/components/question-card-shortcuts-footer";
import { CONTAINER_STYLES } from "./data/container-styles";
import { useDismissibleCards } from "@/components/templates/shared/hooks/use-dismissible-cards";
import { getAwaitingUserResponseLabel } from "@/components/templates/shared/lib/reasoning-labels";
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
		handleClarificationDismiss,
		webResultsEnabled,
		setWebResultsEnabled,
		companyKnowledgeEnabled,
		setCompanyKnowledgeEnabled,
		queuedPrompts,
		removeQueuedPrompt,
		activeQuestionCard,
		handleSubmit,
		handleSuggestedQuestionClick,
		handleWidgetPrimaryAction,
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
	const { shouldShowQuestionCard: shouldShowQuestionCardRaw, activeQuestionCardKey, hideQuestionCard, dismissQuestionCard } =
		useDismissibleCards({
			activeQuestionCard,
			activePlanWidget: null,
			onDismissQuestionCard: handleClarificationDismiss,
		});
	const shouldShowQuestionCard = !isRequestInFlight && shouldShowQuestionCardRaw;

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
						className={`${styles.rovoViewChat} flex flex-1 flex-col items-center overflow-hidden`}
					>
						<div className="flex flex-1 flex-col overflow-hidden w-full max-w-[768px]">
							<RovoChatMessages
								uiMessages={uiMessages}
								variant="sidepanel"
								messageMode="ask"
								enableSmartWidgets={true}
								onSuggestedQuestionClick={handleSuggestedQuestionClick}
								onWidgetPrimaryAction={handleWidgetPrimaryAction}
								userName={userName ?? undefined}
								conversationContextRef={conversationContextRef}
								scrollSpacerRef={scrollSpacerRef}
								contentBottomPadding={shouldShowQuestionCard && activeQuestionCard !== null ? "24px" : undefined}
								isStreaming={isStreaming}
								isSubmitPending={isSubmitPending}
								showAwaitingIndicator={shouldShowQuestionCardRaw && activeQuestionCard !== null}
								awaitingIndicatorLabel={getAwaitingUserResponseLabel()}
							/>
						</div>
					</div>

					<div className="shrink-0 mx-auto w-full max-w-[800px]">
						{shouldShowQuestionCard && activeQuestionCard ? (
							<div className="px-3">
								<ClarificationQuestionCard
									key={activeQuestionCardKey ?? undefined}
									questionCard={activeQuestionCard}
									onSubmit={(answers) => {
										void handleClarificationSubmit(answers);
										hideQuestionCard();
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
