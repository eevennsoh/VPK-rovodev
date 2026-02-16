"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ChevronLeftIcon from "@atlaskit/icon/core/chevron-left";
import ChevronRightIcon from "@atlaskit/icon/core/chevron-right";
import CrossIcon from "@atlaskit/icon/core/cross";
import {
	hasRequiredClarificationAnswers,
	type ClarificationAnswers,
	type ClarificationAnswerValue,
	type ParsedQuestionCardPayload,
	type ParsedQuestionCardQuestion,
} from "@/components/templates/shared/lib/question-card-widget";

interface ClarificationQuestionCardProps {
	questionCard: ParsedQuestionCardPayload;
	isSubmitting?: boolean;
	onSubmit: (answers: ClarificationAnswers) => void;
	onDismiss?: () => void;
}

const MAX_GENERATED_OPTIONS = 3;
const CUSTOM_OPTION_PLACEHOLDER = "Tell Rovo what to do...";

function getSelectedValues(answerValue: ClarificationAnswerValue | undefined): string[] {
	if (typeof answerValue === "string") {
		return answerValue.trim().length > 0 ? [answerValue] : [];
	}

	return Array.isArray(answerValue) ? answerValue : [];
}

function getCustomInputValue(
	question: ParsedQuestionCardQuestion,
	answerValue: ClarificationAnswerValue | undefined
): string {
	if (typeof answerValue !== "string") {
		return "";
	}

	const hasMatchingOption = question.options.some((option) => option.id === answerValue);
	return hasMatchingOption ? "" : answerValue;
}

function QuestionOptionRow({
	label,
	description,
	selected,
	index,
	disabled,
	onPress,
}: Readonly<{
	label: string;
	description?: string;
	selected: boolean;
	index: number;
	disabled: boolean;
	onPress: () => void;
}>): React.ReactElement {
	return (
		<li>
			<button
				type="button"
				aria-pressed={selected}
				disabled={disabled}
				onClick={onPress}
				className={cn(
					"flex w-full items-center gap-4 rounded-lg px-2 py-1.5 text-left disabled:cursor-not-allowed disabled:opacity-50",
					selected
						? "bg-bg-selected"
						: disabled
							? "bg-surface"
							: "bg-surface hover:bg-bg-neutral-subtle-hovered"
				)}
			>
				<span
					className={cn(
						"inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] border bg-surface text-sm leading-5 font-medium",
						selected ? "border-border-selected text-text-selected" : "border-border text-text"
					)}
				>
					{index + 1}
				</span>
				<span className="min-w-0 flex-1">
					<span
						className={cn(
							"block truncate text-sm leading-5 font-medium",
							selected ? "text-text-selected" : "text-text"
						)}
					>
						{label}
					</span>
					{description ? (
						<span
							className={cn(
								"block text-sm leading-5 font-normal",
								selected ? "text-text-selected" : "text-text-subtle"
							)}
						>
							{description}
						</span>
					) : null}
				</span>
			</button>
		</li>
	);
}

function QuestionInput({
	question,
	isSubmitting,
	answerValue,
	onAnswerChange,
}: Readonly<{
	question: ParsedQuestionCardQuestion;
	isSubmitting: boolean;
	answerValue: ClarificationAnswerValue | undefined;
	onAnswerChange: (
		value: ClarificationAnswerValue,
		options?: Readonly<{ autoAdvance?: boolean }>
	) => void;
}>): React.ReactElement {
	const selectedValues = getSelectedValues(answerValue);
	const visibleOptions = question.options.slice(0, MAX_GENERATED_OPTIONS);
	const customInputValue = getCustomInputValue(question, answerValue);

	return (
		<ul className="m-0 flex list-none flex-col gap-1 p-0">
			{visibleOptions.map((option, index) => {
				const isSelected = selectedValues.includes(option.id);
				return (
					<QuestionOptionRow
						key={option.id}
						index={index}
						label={option.label}
						description={option.description}
						selected={isSelected}
						disabled={isSubmitting}
						onPress={() => {
							if (question.kind === "single-select") {
								onAnswerChange(option.id, { autoAdvance: true });
								return;
							}

							const nextValues = isSelected
								? selectedValues.filter((value) => value !== option.id)
								: [...selectedValues, option.id];
							onAnswerChange(nextValues);
						}}
					/>
				);
			})}
			<li className="flex h-8 items-center gap-4 rounded-lg pl-2">
				<span className="inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-border bg-surface text-sm leading-5 font-medium text-text">
					4
				</span>
				<Input
					aria-label={`${question.label} custom answer`}
					value={customInputValue}
					onChange={(event) => onAnswerChange(event.currentTarget.value)}
					disabled={isSubmitting}
					placeholder={CUSTOM_OPTION_PLACEHOLDER}
					className="h-8 border-input bg-bg-input text-sm leading-5"
				/>
			</li>
		</ul>
	);
}

export function ClarificationQuestionCard({
	questionCard,
	isSubmitting = false,
	onSubmit,
	onDismiss,
}: Readonly<ClarificationQuestionCardProps>): React.ReactElement {
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [answers, setAnswers] = useState<ClarificationAnswers>({});

	const safeQuestionIndex = Math.min(
		Math.max(0, currentQuestionIndex),
		questionCard.questions.length - 1
	);
	const currentQuestion = questionCard.questions[safeQuestionIndex];
	const canGoToPreviousQuestion = safeQuestionIndex > 0;
	const canGoToNextQuestion = safeQuestionIndex < questionCard.questions.length - 1;
	const canSubmit = hasRequiredClarificationAnswers(questionCard, answers);
	const goToNextQuestionIfAvailable = () => {
		setCurrentQuestionIndex((previousIndex) =>
			Math.min(questionCard.questions.length - 1, previousIndex + 1)
		);
	};

	return (
		<div
			data-testid="clarification-question-card"
			className="mx-auto w-full max-w-[776px] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_-2px_50px_8px_rgba(30,31,33,0.08)]"
		>
			<header className="px-4 pb-2 pt-4">
				<div className="flex items-start justify-between gap-2">
					<h2 className="min-w-0 text-sm leading-5 font-medium text-text">
						{currentQuestion.label}
					</h2>
					{onDismiss ? (
						<Button
							aria-label="Dismiss questions"
							size="icon"
							variant="ghost"
							disabled={isSubmitting}
							className="-mr-1 -mt-1 shrink-0"
							onClick={onDismiss}
						>
							<CrossIcon label="" size="small" />
						</Button>
					) : null}
				</div>
			</header>

			<div className="px-3 pb-4">
				<QuestionInput
					question={currentQuestion}
					isSubmitting={isSubmitting}
					answerValue={answers[currentQuestion.id]}
					onAnswerChange={(answerValue, options) => {
						if (isSubmitting) {
							return;
						}

						setAnswers((previousAnswers) => ({
							...previousAnswers,
							[currentQuestion.id]: answerValue,
						}));

						if (options?.autoAdvance && currentQuestion.kind === "single-select") {
							goToNextQuestionIfAvailable();
						}
					}}
				/>
			</div>

			<footer className="flex h-16 items-center justify-between border-t border-border p-4">
				<div className="flex items-center gap-2">
					<button
						type="button"
						aria-label="Previous question"
						disabled={!canGoToPreviousQuestion || isSubmitting}
						onClick={() =>
							setCurrentQuestionIndex((previousIndex) =>
								Math.max(0, previousIndex - 1)
							)
						}
						className="inline-flex size-5 items-center justify-center rounded text-icon-subtle hover:bg-bg-neutral-subtle-hovered disabled:cursor-not-allowed disabled:opacity-50"
					>
						<ChevronLeftIcon label="Previous question" size="small" />
					</button>
					{questionCard.questions.map((question, index) => (
						<span
							key={question.id}
							className={cn(
								"size-2 rounded-full border",
								index === safeQuestionIndex
									? "border-transparent bg-bg-neutral-bold"
									: "border-border-bold bg-transparent"
							)}
						/>
					))}
					<button
						type="button"
						aria-label="Next question"
						disabled={!canGoToNextQuestion || isSubmitting}
						onClick={() =>
							setCurrentQuestionIndex((previousIndex) =>
								Math.min(questionCard.questions.length - 1, previousIndex + 1)
							)
						}
						className="inline-flex size-5 items-center justify-center rounded text-icon-subtle hover:bg-bg-neutral-subtle-hovered disabled:cursor-not-allowed disabled:opacity-50"
					>
						<ChevronRightIcon label="Next question" size="small" />
					</button>
				</div>

				<Button
					disabled={!canSubmit || isSubmitting}
					onClick={() => onSubmit(answers)}
				>
					{isSubmitting ? "Submitting..." : "Submit"}
				</Button>
			</footer>
		</div>
	);
}
