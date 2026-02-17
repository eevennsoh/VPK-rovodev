"use client";

import { useEffect } from "react";
import {
	getLatestDataPart,
	isMessageTextStreaming,
	type RovoUIMessage,
} from "@/lib/rovo-ui-messages";
import type { QueuedPromptItem } from "@/app/contexts";
import { ChatMessages } from "@/components/templates/shared/components/chat-messages";
import { useScrollAnchoring } from "@/components/templates/shared/hooks/use-scroll-anchoring";
import { ClarificationQuestionCard } from "@/components/templates/shared/components/clarification-question-card";
import { PlanApprovalCard } from "@/components/templates/shared/components/plan-approval-card";
import { PlanCardWidget } from "@/components/templates/shared/components/plan-card-widget";
import type { PlanApprovalSelection } from "@/components/templates/shared/lib/plan-approval";
import {
	parsePlanWidgetPayload,
	type ParsedPlanWidgetPayload,
} from "@/components/templates/shared/lib/plan-widget";
import type {
	ClarificationAnswers,
	ParsedQuestionCardPayload,
} from "@/components/templates/shared/lib/question-card-widget";
import { Footer } from "@/components/ui/footer";
import ArrowDownIcon from "@atlaskit/icon/core/arrow-down";
import { Button } from "@/components/ui/button";
import { token } from "@/lib/tokens";
import { getAgentTeamModeCopy } from "@/components/templates/agents-team/lib/agent-team-copy";
import AgentsTeamComposer from "./agents-team-composer";
import { useScrollToBottom } from "../hooks/use-scroll-to-bottom";
import { useDismissibleCards } from "../hooks/use-dismissible-cards";

const CHAT_COMPOSER_BASE_BOTTOM_PADDING = "128px";
const CHAT_COMPOSER_WITH_QUEUE_BOTTOM_PADDING = "320px";
const AWAITING_INDICATOR_BOTTOM_PADDING = "112px";
const OVERLAY_CARD_BOTTOM_PADDING = "520px";

interface AgentsTeamChatViewProps {
	prompt: string;
	isAgentTeamMode: boolean;
	isStreaming: boolean;
	isWidgetLoading: boolean;
	loadingWidgetType: string | null;
	isPlanResponseComplete: boolean;
	uiMessages: RovoUIMessage[];
	streamingUiMessages: RovoUIMessage[];
	activeQuestionCard: ParsedQuestionCardPayload | null;
	activePlanWidget: ParsedPlanWidgetPayload | null;
	onPromptChange: (value: string) => void;
	onSubmit: () => Promise<void> | void;
	onStop: () => void;
	onAgentTeamModeToggle: () => void;
	queuedPrompts: ReadonlyArray<QueuedPromptItem>;
	onRemoveQueuedPrompt: (id: string) => void;
	onClarificationSubmit: (answers: ClarificationAnswers) => void;
	onApprovalSubmit: (selection: PlanApprovalSelection) => void;
	onSuggestedQuestionClick: (question: string) => Promise<void> | void;
	onDeleteMessage?: (messageId: string) => void;
}

export default function AgentsTeamChatView({
	prompt,
	isAgentTeamMode,
	isStreaming,
	isWidgetLoading,
	loadingWidgetType,
	isPlanResponseComplete,
	uiMessages,
	streamingUiMessages,
	activeQuestionCard,
	activePlanWidget,
	onPromptChange,
	onSubmit,
	onStop,
	onAgentTeamModeToggle,
	queuedPrompts,
	onRemoveQueuedPrompt,
	onClarificationSubmit,
	onApprovalSubmit,
	onSuggestedQuestionClick,
	onDeleteMessage,
}: Readonly<AgentsTeamChatViewProps>) {
	const { conversationContextRef, scrollSpacerRef } = useScrollAnchoring({
		uiMessages,
	});
	const { showScrollButton, scrollToBottom } = useScrollToBottom({
		conversationContextRef,
	});
	const {
		shouldShowQuestionCard,
		shouldShowApprovalCard,
		activeQuestionCardKey,
		activePlanKey,
		dismissQuestionCard,
		dismissApprovalCard,
	} = useDismissibleCards({ activeQuestionCard, activePlanWidget });

	const widgetLoadingLabel =
		loadingWidgetType === "plan"
			? "Generating your plan"
			: loadingWidgetType === "question-card"
				? "Preparing follow-up questions"
				: loadingWidgetType === "work-items"
					? "Comparing Jira work items"
					: "Processing your request";

	const gatedShouldShowQuestionCard = shouldShowQuestionCard && !isWidgetLoading && !isStreaming;
	const gatedShouldShowApprovalCard =
		shouldShowApprovalCard && isPlanResponseComplete;
	const hasPendingResponseCard =
		gatedShouldShowQuestionCard || gatedShouldShowApprovalCard;
	const shouldCollapsePendingCard =
		hasPendingResponseCard && showScrollButton;
	const showQuestionCardOverlay =
		gatedShouldShowQuestionCard && !shouldCollapsePendingCard;
	const showApprovalCardOverlay =
		gatedShouldShowApprovalCard && !shouldCollapsePendingCard;
	const showBottomOverlayCard = showQuestionCardOverlay || showApprovalCardOverlay;
	const isAwaitingUserInput = hasPendingResponseCard;
	const chatComposerBottomPadding = queuedPrompts.length > 0
		? CHAT_COMPOSER_WITH_QUEUE_BOTTOM_PADDING
		: CHAT_COMPOSER_BASE_BOTTOM_PADDING;
	const contentBottomPadding = showBottomOverlayCard
		? OVERLAY_CARD_BOTTOM_PADDING
		: hasPendingResponseCard
			? AWAITING_INDICATOR_BOTTOM_PADDING
			: chatComposerBottomPadding;
	const shouldShowBottomGradient = showBottomOverlayCard || !hasPendingResponseCard;

	useEffect(() => {
		if (!showBottomOverlayCard || showScrollButton) return;
		void conversationContextRef.current?.scrollToBottom({
			animation: "instant",
			ignoreEscapes: true,
		});
	}, [conversationContextRef, showBottomOverlayCard, showScrollButton]);

	return (
		<div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
			<div className="flex min-h-0 flex-1 justify-center overflow-hidden px-4">
				<div className="flex min-h-0 w-full max-w-[800px] flex-col">
					<ChatMessages
						uiMessages={uiMessages}
						streamingIndicatorMessages={streamingUiMessages}
						hideScrollbar
						onSuggestedQuestionClick={onSuggestedQuestionClick}
						onDeleteMessage={onDeleteMessage}
						conversationContextRef={conversationContextRef}
						scrollSpacerRef={scrollSpacerRef}
						contentTopPadding="24px"
						contentBottomPadding={contentBottomPadding}
						isStreaming={isStreaming}
						streamingIndicatorVariant="reasoning-expanded"
						thinkingLabel="Reasoning"
						showFeedbackActions={false}
						showFollowUpSuggestions={!isAwaitingUserInput}
						showAwaitingIndicator={isAwaitingUserInput || isWidgetLoading}
						awaitingIndicatorLabel={
							isWidgetLoading
								? widgetLoadingLabel
								: gatedShouldShowQuestionCard
									? "Waiting for your answers"
									: gatedShouldShowApprovalCard
										? "Waiting for your approval"
										: "Processing your request"
						}
						renderWidget={(widget, message) => {
							if (widget.type !== "plan") return null;

							const parsedPlanWidget = parsePlanWidgetPayload(widget.data);
							const latestWidgetLoadingPart = getLatestDataPart(
								message,
								"data-widget-loading"
							);
							const isPlanWidgetLoading =
								latestWidgetLoadingPart?.data.type === "plan" &&
								latestWidgetLoadingPart.data.loading === true;
							const isPlanWidgetStreaming =
								isPlanWidgetLoading || isMessageTextStreaming(message);
							return parsedPlanWidget ? (
								<div className="pt-2">
									<PlanCardWidget
										title={parsedPlanWidget.title}
										description={parsedPlanWidget.description}
										emoji={parsedPlanWidget.emoji}
										tasks={parsedPlanWidget.tasks}
										agents={parsedPlanWidget.agents}
										isStreaming={isPlanWidgetStreaming}
									/>
								</div>
							) : null;
						}}
					/>
				</div>
			</div>

			{shouldShowBottomGradient ? (
				<div
					aria-hidden
					className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-52"
					style={{
						background: `linear-gradient(to top, ${token("elevation.surface")} 28%, transparent 100%)`,
					}}
				/>
			) : null}

			<div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 px-4">
				<div className="pointer-events-auto relative mx-auto w-full max-w-[800px]">
					{showScrollButton ? (
						<Button
							aria-label="Scroll to bottom"
							className="absolute bottom-full left-1/2 mb-4 -translate-x-1/2 cursor-pointer rounded-full border-0 bg-surface hover:bg-surface-hovered"
							size="icon"
							variant="ghost"
							onClick={scrollToBottom}
							style={{ boxShadow: token("elevation.shadow.overlay") }}
						>
							<ArrowDownIcon label="" color={token("color.icon.subtlest")} size="small" />
						</Button>
					) : null}
					<BottomOverlayContent
						shouldShowQuestionCard={showQuestionCardOverlay}
						shouldShowApprovalCard={showApprovalCardOverlay}
						showComposer={!hasPendingResponseCard}
						activeQuestionCard={activeQuestionCard}
						activeQuestionCardKey={activeQuestionCardKey}
						activePlanKey={activePlanKey}
						isStreaming={isStreaming}
						prompt={prompt}
						onClarificationSubmit={onClarificationSubmit}
						onApprovalSubmit={onApprovalSubmit}
						onDismissQuestionCard={dismissQuestionCard}
						onDismissApprovalCard={dismissApprovalCard}
						onPromptChange={onPromptChange}
						onSubmit={onSubmit}
						onStop={onStop}
						isAgentTeamMode={isAgentTeamMode}
						onAgentTeamModeToggle={onAgentTeamModeToggle}
						queuedPrompts={queuedPrompts}
						onRemoveQueuedPrompt={onRemoveQueuedPrompt}
					/>
				</div>
			</div>

			<div className="absolute inset-x-0 bottom-0 z-20 flex justify-center">
				{showQuestionCardOverlay ? (
					<Footer hideIcon>
						<span>
							<kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd> to navigate
						</span>
						<span aria-hidden>•</span>
						<span>
							<kbd className="font-sans">↵</kbd> Enter to select
						</span>
						<span aria-hidden>•</span>
						<span>Esc to skip</span>
					</Footer>
				) : (
					<Footer />
				)}
			</div>
		</div>
	);
}

interface BottomOverlayContentProps {
	shouldShowQuestionCard: boolean;
	shouldShowApprovalCard: boolean;
	showComposer: boolean;
	activeQuestionCard: ParsedQuestionCardPayload | null;
	activeQuestionCardKey: string | null;
	activePlanKey: string | null;
	isStreaming: boolean;
	prompt: string;
	onClarificationSubmit: (answers: ClarificationAnswers) => void;
	onApprovalSubmit: (selection: PlanApprovalSelection) => void;
	onDismissQuestionCard: () => void;
	onDismissApprovalCard: () => void;
	onPromptChange: (value: string) => void;
	onSubmit: () => Promise<void> | void;
	onStop: () => void;
	isAgentTeamMode: boolean;
	onAgentTeamModeToggle: () => void;
	queuedPrompts: ReadonlyArray<QueuedPromptItem>;
	onRemoveQueuedPrompt: (id: string) => void;
}

function BottomOverlayContent({
	shouldShowQuestionCard,
	shouldShowApprovalCard,
	showComposer,
	activeQuestionCard,
	activeQuestionCardKey,
	activePlanKey,
	isStreaming,
	prompt,
	onClarificationSubmit,
	onApprovalSubmit,
	onDismissQuestionCard,
	onDismissApprovalCard,
	onPromptChange,
	onSubmit,
	onStop,
	isAgentTeamMode,
	onAgentTeamModeToggle,
	queuedPrompts,
	onRemoveQueuedPrompt,
}: Readonly<BottomOverlayContentProps>) {
	const modeCopy = getAgentTeamModeCopy(isAgentTeamMode);

	if (shouldShowQuestionCard && activeQuestionCard && activeQuestionCardKey) {
		return (
			<div className="px-1">
				<ClarificationQuestionCard
					key={activeQuestionCardKey}
					questionCard={activeQuestionCard}
					onSubmit={(answers) => {
						onClarificationSubmit(answers);
						onDismissQuestionCard();
					}}
					onDismiss={onDismissQuestionCard}
				/>
			</div>
		);
	}

	if (shouldShowApprovalCard && activePlanKey) {
		return (
			<div className="px-1">
				<PlanApprovalCard
					key={activePlanKey}
					isSubmitting={isStreaming}
					onSubmit={(selection) => {
						onApprovalSubmit(selection);
						onDismissApprovalCard();
					}}
					onDismiss={onDismissApprovalCard}
				/>
			</div>
		);
	}

	return showComposer ? (
		<AgentsTeamComposer
			prompt={prompt}
			placeholder={modeCopy.placeholder}
			isStreaming={isStreaming}
			isAgentTeamMode={isAgentTeamMode}
			onAgentTeamModeToggle={onAgentTeamModeToggle}
			queuedPrompts={queuedPrompts}
			onPromptChange={onPromptChange}
			onSubmit={onSubmit}
			onStop={onStop}
			onRemoveQueuedPrompt={onRemoveQueuedPrompt}
		/>
	) : null;
}
