"use client";

import { type RovoUIMessage } from "@/lib/rovo-ui-messages";
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
import ArrowDownIcon from "@atlaskit/icon/core/arrow-down";
import { Button } from "@/components/ui/button";
import { token } from "@/lib/tokens";
import AgentsTeamComposer from "./agents-team-composer";
import { useScrollToBottom } from "../hooks/use-scroll-to-bottom";
import { useDismissibleCards } from "../hooks/use-dismissible-cards";

const DEFAULT_AGENTS_TEAM_PLACEHOLDER = "Let a team of AI minions solve your problem";

interface AgentsTeamChatViewProps {
	prompt: string;
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
	onClarificationSubmit: (answers: ClarificationAnswers) => void;
	onApprovalSubmit: (selection: PlanApprovalSelection) => void;
	onSuggestedQuestionClick: (question: string) => Promise<void> | void;
}

export default function AgentsTeamChatView({
	prompt,
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
	onClarificationSubmit,
	onApprovalSubmit,
	onSuggestedQuestionClick,
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

	const gatedShouldShowQuestionCard = shouldShowQuestionCard && !isWidgetLoading;
	const gatedShouldShowApprovalCard =
		shouldShowApprovalCard && isPlanResponseComplete;
	const gatedHasBottomOverlayCard =
		gatedShouldShowQuestionCard || gatedShouldShowApprovalCard;
	const isAwaitingUserInput =
		gatedShouldShowQuestionCard || gatedShouldShowApprovalCard;

	return (
		<div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
			<div className="flex min-h-0 flex-1 justify-center overflow-hidden px-4">
				<div className="flex min-h-0 w-full max-w-[800px] flex-col">
						<ChatMessages
							uiMessages={uiMessages}
							streamingIndicatorMessages={streamingUiMessages}
							hideScrollbar
							onSuggestedQuestionClick={onSuggestedQuestionClick}
							conversationContextRef={conversationContextRef}
						scrollSpacerRef={scrollSpacerRef}
						contentTopPadding="24px"
						contentBottomPadding={gatedHasBottomOverlayCard ? "360px" : "128px"}
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
						renderWidget={(widget) => {
							if (widget.type !== "plan") return null;

							const parsedPlanWidget = parsePlanWidgetPayload(widget.data);
							return parsedPlanWidget ? (
								<div className="pt-2">
									<PlanCardWidget
										title={parsedPlanWidget.title}
										description={parsedPlanWidget.description}
										emoji={parsedPlanWidget.emoji}
										tasks={parsedPlanWidget.tasks}
										agents={parsedPlanWidget.agents}
										isStreaming={isStreaming}
									/>
								</div>
							) : null;
						}}
					/>
				</div>
			</div>

			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-52"
				style={{
					background: `linear-gradient(to top, ${token("elevation.surface")} 28%, transparent 100%)`,
				}}
			/>

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
						shouldShowQuestionCard={gatedShouldShowQuestionCard}
						shouldShowApprovalCard={gatedShouldShowApprovalCard}
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
					/>
				</div>
			</div>
		</div>
	);
}

interface BottomOverlayContentProps {
	shouldShowQuestionCard: boolean;
	shouldShowApprovalCard: boolean;
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
}

function BottomOverlayContent({
	shouldShowQuestionCard,
	shouldShowApprovalCard,
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
}: Readonly<BottomOverlayContentProps>) {
	if (shouldShowQuestionCard && activeQuestionCard && activeQuestionCardKey) {
		return (
			<div className="px-1">
				<ClarificationQuestionCard
					key={activeQuestionCardKey}
					questionCard={activeQuestionCard}
					isSubmitting={isStreaming}
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

	return (
		<AgentsTeamComposer
			prompt={prompt}
			placeholder={DEFAULT_AGENTS_TEAM_PLACEHOLDER}
			isStreaming={isStreaming}
			onPromptChange={onPromptChange}
			onSubmit={onSubmit}
			onStop={onStop}
		/>
	);
}
