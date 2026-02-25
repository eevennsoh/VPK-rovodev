"use client";

import { useEffect } from "react";
import { getLatestDataPart, isMessageTextStreaming } from "@/lib/rovo-ui-messages";
import type { RovoUIMessage } from "@/lib/rovo-ui-messages";
import { ChatMessages } from "@/components/templates/shared/components/chat-messages";
import { useScrollAnchoring } from "@/components/templates/shared/hooks/use-scroll-anchoring";
import { ClarificationQuestionCard } from "@/components/templates/shared/components/clarification-question-card";
import { ApprovalCard } from "@/components/blocks/approval-card/page";
import { parsePlanWidgetPayload } from "@/components/templates/shared/lib/plan-widget";
import type { ParsedQuestionCardPayload } from "@/components/templates/shared/lib/question-card-widget";
import type { ClarificationAnswers } from "@/components/templates/shared/lib/question-card-widget";
import type { PlanApprovalSelection } from "@/components/templates/shared/lib/plan-approval";
import type { QueuedPromptItem } from "@/app/contexts";
import { Footer } from "@/components/ui/footer";
import ArrowDownIcon from "@atlaskit/icon/core/arrow-down";
import { Button } from "@/components/ui/button";
import { token } from "@/lib/tokens";
import { getPlanModeCopy } from "@/components/templates/agents-team/lib/agent-team-copy";
import { GenerativeWidgetCard } from "@/components/templates/shared/components/generative-widget-card";
import {
	usePlanState,
	usePlanActions,
} from "@/app/contexts/context-agents-team";
import PlanComposer from "./agents-team-composer";
import { PlanCardWidgetInline } from "./plan-card-widget-inline";
import { useScrollToBottom } from "../hooks/use-scroll-to-bottom";
import { useDismissibleCards } from "../hooks/use-dismissible-cards";
import LoadingWidget from "./loading-widget";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHAT_COMPOSER_BASE_BOTTOM_PADDING = "128px";
const CHAT_COMPOSER_WITH_QUEUE_BOTTOM_PADDING = "320px";
const OVERLAY_CARD_BOTTOM_PADDING = "520px";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWidgetLoadingLabel(widgetType: string | null): string {
	if (widgetType === "plan") return "Generating your plan";
	if (widgetType === "question-card") return "Preparing follow-up questions";
	if (widgetType === "work-items") return "Comparing Jira work items";
	return "Processing your request";
}

function getAwaitingIndicatorLabel(
	isWidgetLoading: boolean,
	widgetLoadingLabel: string,
	showQuestionCard: boolean,
	showApprovalCard: boolean,
): string {
	if (isWidgetLoading) return widgetLoadingLabel;
	if (showQuestionCard) return "Waiting for your answers";
	if (showApprovalCard) return "Waiting for your approval";
	return "Processing your request";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ScrollToBottomButtonProps {
	visible: boolean;
	onClick: () => void;
}

function ScrollToBottomButton({ visible, onClick }: Readonly<ScrollToBottomButtonProps>) {
	if (!visible) return null;

	return (
		<Button
			aria-label="Scroll to bottom"
			className="absolute bottom-full left-1/2 mb-4 -translate-x-1/2 cursor-pointer rounded-full border-0 bg-surface hover:bg-surface-hovered"
			size="icon"
			variant="ghost"
			onClick={onClick}
			style={{ boxShadow: token("elevation.shadow.overlay") }}
		>
			<ArrowDownIcon label="" color={token("color.icon.subtlest")} size="small" />
		</Button>
	);
}

interface BottomOverlayProps {
	showQuestionCard: boolean;
	showApprovalCard: boolean;
	hasPendingResponseCard: boolean;
	activeQuestionCard: ParsedQuestionCardPayload | null;
	activeQuestionCardKey: string | null;
	activePlanKey: string | null;
	isRequestInFlight: boolean;
	onClarificationSubmit: (answers: ClarificationAnswers) => void;
	onDismissQuestionCard: () => void;
	onApprovalSubmit: (selection: PlanApprovalSelection) => void;
	onDismissApprovalCard: () => void;
	composerProps: {
		prompt: string;
		placeholder: string;
		isStreaming: boolean;
		isPlanMode: boolean;
		onPlanModeToggle: () => void;
		queuedPrompts: ReadonlyArray<QueuedPromptItem>;
		onPromptChange: (value: string) => void;
		onSubmit: () => Promise<void> | void;
		onStop: () => Promise<void>;
		onRemoveQueuedPrompt: (id: string) => void;
	};
}

function BottomOverlay({
	showQuestionCard,
	showApprovalCard,
	hasPendingResponseCard,
	activeQuestionCard,
	activeQuestionCardKey,
	activePlanKey,
	isRequestInFlight,
	onClarificationSubmit,
	onDismissQuestionCard,
	onApprovalSubmit,
	onDismissApprovalCard,
	composerProps,
}: Readonly<BottomOverlayProps>) {
	if (showQuestionCard && activeQuestionCard && activeQuestionCardKey) {
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

	if (showApprovalCard && activePlanKey) {
		return (
			<div className="px-1">
				<ApprovalCard
					key={activePlanKey}
					isSubmitting={isRequestInFlight}
					onSubmit={(selection) => {
						onApprovalSubmit(selection);
						onDismissApprovalCard();
					}}
					onDismiss={onDismissApprovalCard}
				/>
			</div>
		);
	}

	if (!hasPendingResponseCard) {
		return <PlanComposer {...composerProps} />;
	}

	return null;
}

interface ChatFooterProps {
	showOverlayHints: boolean;
}

function ChatFooter({ showOverlayHints }: Readonly<ChatFooterProps>) {
	if (!showOverlayHints) return <Footer />;

	return (
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
	);
}

function renderPlanWidget(
	widget: { type: string; data: unknown },
	message: RovoUIMessage,
): React.ReactNode {
	const parsedPlanWidget = parsePlanWidgetPayload(widget.data);
	const latestWidgetLoadingPart = getLatestDataPart(message, "data-widget-loading");
	const isPlanWidgetLoading =
		latestWidgetLoadingPart?.data.type === "plan" &&
		latestWidgetLoadingPart.data.loading === true;
	const isPlanWidgetStreaming = isPlanWidgetLoading || isMessageTextStreaming(message);

	return parsedPlanWidget ? (
		<div className="pt-2">
			<PlanCardWidgetInline
				title={parsedPlanWidget.title}
				description={parsedPlanWidget.description}
				tasks={parsedPlanWidget.tasks}
				agents={parsedPlanWidget.agents}
				isStreaming={isPlanWidgetStreaming}
			/>
		</div>
	) : null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PlanChatView() {
	const {
		prompt,
		isPlanMode,
		isStreaming,
		isSubmitPending,
		isWidgetLoading,
		loadingWidgetType,
		isPlanMessageComplete,
		uiMessages,
		normalizedUiMessages: streamingUiMessages,
		activeQuestionCard,
		activePlanWidget,
		queuedPrompts,
	} = usePlanState();

	const {
		setPrompt,
		handleSubmit,
		stopStreaming,
		togglePlanMode,
		removeQueuedPrompt,
		handleClarificationSubmit,
		handleClarificationDismiss,
		handleApprovalSubmit,
		handleSuggestedQuestionClick,
		handleWidgetPrimaryAction,
	} = usePlanActions();

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
	} = useDismissibleCards({
		activeQuestionCard,
		activePlanWidget,
		onDismissQuestionCard: handleClarificationDismiss,
	});

	const widgetLoadingLabel = getWidgetLoadingLabel(loadingWidgetType);
	const isRequestInFlight = isStreaming || isSubmitPending;
	const gatedShouldShowQuestionCard = shouldShowQuestionCard && !isWidgetLoading && !isRequestInFlight;
	const gatedShouldShowApprovalCard = shouldShowApprovalCard && isPlanMessageComplete && !isRequestInFlight;
	const hasPendingResponseCard = gatedShouldShowQuestionCard || gatedShouldShowApprovalCard;
	const showBottomOverlayCard = gatedShouldShowQuestionCard || gatedShouldShowApprovalCard;
	const isAwaitingUserInput = hasPendingResponseCard;
	const chatComposerBottomPadding = queuedPrompts.length > 0 ? CHAT_COMPOSER_WITH_QUEUE_BOTTOM_PADDING : CHAT_COMPOSER_BASE_BOTTOM_PADDING;
	const contentBottomPadding = showBottomOverlayCard ? OVERLAY_CARD_BOTTOM_PADDING : chatComposerBottomPadding;
	const shouldShowBottomGradient = showBottomOverlayCard || !hasPendingResponseCard;
	const modeCopy = getPlanModeCopy(isPlanMode);

	useEffect(() => {
		if (!showBottomOverlayCard) return;
		void conversationContextRef.current?.scrollToBottom({
			animation: "instant",
			ignoreEscapes: true,
		});
	}, [conversationContextRef, showBottomOverlayCard]);

	return (
		<div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
			<div className="flex min-h-0 flex-1 justify-center overflow-hidden px-4">
				<div className="flex min-h-0 w-full max-w-[800px] flex-col">
					<ChatMessages
						uiMessages={uiMessages}
						streamingIndicatorMessages={streamingUiMessages}
						hideScrollbar
						onSuggestedQuestionClick={handleSuggestedQuestionClick}
						conversationContextRef={conversationContextRef}
						scrollSpacerRef={scrollSpacerRef}
						contentTopPadding="24px"
						contentBottomPadding={contentBottomPadding}
						isStreaming={isStreaming}
						isSubmitPending={isSubmitPending}
						streamingIndicatorVariant="reasoning-expanded"
						showFeedbackActions={false}
						showFollowUpSuggestions={!isAwaitingUserInput}
						showAwaitingIndicator={isAwaitingUserInput || isWidgetLoading}
						awaitingIndicatorLabel={getAwaitingIndicatorLabel(
							isWidgetLoading,
							widgetLoadingLabel,
							gatedShouldShowQuestionCard,
							gatedShouldShowApprovalCard,
						)}
						renderLoadingWidget={(widgetType) => (
							<LoadingWidget widgetType={widgetType} />
						)}
						renderWidget={(widget, message) => {
							if (widget.type !== "plan") {
								return (
									<GenerativeWidgetCard
										widgetType={widget.type}
										widgetData={widget.data}
										onPrimaryAction={handleWidgetPrimaryAction}
									/>
								);
							}

							return renderPlanWidget(widget, message);
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
					<ScrollToBottomButton visible={showScrollButton} onClick={scrollToBottom} />
					<BottomOverlay
						showQuestionCard={gatedShouldShowQuestionCard}
						showApprovalCard={gatedShouldShowApprovalCard}
						hasPendingResponseCard={hasPendingResponseCard}
						activeQuestionCard={activeQuestionCard}
						activeQuestionCardKey={activeQuestionCardKey}
						activePlanKey={activePlanKey}
						isRequestInFlight={isRequestInFlight}
						onClarificationSubmit={handleClarificationSubmit}
						onDismissQuestionCard={dismissQuestionCard}
						onApprovalSubmit={handleApprovalSubmit}
						onDismissApprovalCard={dismissApprovalCard}
						composerProps={{
							prompt,
							placeholder: modeCopy.placeholder,
							isStreaming: isRequestInFlight,
							isPlanMode,
							onPlanModeToggle: togglePlanMode,
							queuedPrompts,
							onPromptChange: setPrompt,
							onSubmit: handleSubmit,
							onStop: stopStreaming,
							onRemoveQueuedPrompt: removeQueuedPrompt,
						}}
					/>
				</div>
			</div>

			<div className="absolute inset-x-0 bottom-0 z-20 flex justify-center">
				<ChatFooter showOverlayHints={gatedShouldShowQuestionCard || gatedShouldShowApprovalCard} />
			</div>
		</div>
	);
}
