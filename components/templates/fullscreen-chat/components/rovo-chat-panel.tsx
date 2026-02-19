"use client";

import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useRovoChatPanel } from "../hooks/use-rovo-chat-panel";
import RovoChatHeader from "./rovo-chat-header";
import RovoChatMessages from "./rovo-chat-messages";
import RovoChatInput from "./rovo-chat-input";
import { ClarificationQuestionCard } from "@/components/templates/shared/components/clarification-question-card";
import { QuestionCardShortcutsFooter } from "@/components/templates/shared/components/question-card-shortcuts-footer";
import styles from "./rovo-chat-panel.module.css";
import type { Product } from "../types";

interface RovoChatPanelProps {
	onClose: () => void;
	product: Product;
}

export default function RovoChatPanel({ onClose, product }: Readonly<RovoChatPanelProps>) {
	const {
		prompt,
		setPrompt,
		variant,
		setVariant,
		uiMessages,
		userName,
		isStreaming,
		queuedPrompts,
		removeQueuedPrompt,
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
		conversationContextRef,
		scrollSpacerRef,
		handleSubmit,
		handleSuggestedQuestionClick,
		handleFullScreen,
		hasChatStarted,
		activeQuestionCard,
		handleClarificationSubmit,
		stopStreaming,
	} = useRovoChatPanel({ product });
	const activeQuestionCardKey = useMemo(
		() => (activeQuestionCard ? `${activeQuestionCard.sessionId}-${activeQuestionCard.round}` : null),
		[activeQuestionCard]
	);
	const [dismissedQuestionCardKey, setDismissedQuestionCardKey] = useState<string | null>(null);
	const shouldShowQuestionCard = !isStreaming && activeQuestionCard !== null && dismissedQuestionCardKey !== activeQuestionCardKey;
	const dismissQuestionCard = useCallback(() => {
		if (!activeQuestionCardKey) {
			return;
		}
		setDismissedQuestionCardKey(activeQuestionCardKey);
	}, [activeQuestionCardKey]);

	const isFloating = variant === "floating";
	const panelHeight = isFloating
		? (hasChatStarted ? "640px" : "340px")
		: "calc(100vh - 48px)";

	return (
		<div
			className={cn(
				styles.rovoChatPanel,
				"flex w-[400px] flex-col bg-surface",
				"transition-[height]",
				isFloating
					? "fixed right-6 bottom-6 z-[1000] rounded-xl shadow-2xl"
					: "relative border-l border-border",
			)}
			style={{
				height: panelHeight,
				transitionDuration: "var(--duration-slow)",
				transitionTimingFunction: "var(--ease-in-out)",
			}}
		>
			<RovoChatHeader
				onClose={onClose}
				variant={variant}
				onVariantChange={setVariant}
				onFullScreen={handleFullScreen}
			/>

			<RovoChatMessages
				uiMessages={uiMessages}
				variant={variant}
				messageMode="ask"
				enableSmartWidgets={true}
				onSuggestedQuestionClick={handleSuggestedQuestionClick}
				userName={userName ?? undefined}
				conversationContextRef={conversationContextRef}
				scrollSpacerRef={scrollSpacerRef}
				isStreaming={isStreaming}
			/>

			{shouldShowQuestionCard && activeQuestionCard ? (
				<div className="px-3 pb-1">
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
					isStreaming={isStreaming}
					onPromptChange={setPrompt}
					onSubmit={handleSubmit}
					onToggleDictation={toggleDictation}
					onStopStreaming={stopStreaming}
					contextEnabled={contextEnabled}
					onContextToggle={setContextEnabled}
					product={product}
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
	);
}
