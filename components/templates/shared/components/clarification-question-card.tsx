"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ChevronLeftIcon from "@atlaskit/icon/core/chevron-left";
import ChevronRightIcon from "@atlaskit/icon/core/chevron-right";
import CrossIcon from "@atlaskit/icon/core/cross";
import {
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
const CUSTOM_OPTION_INDEX = MAX_GENERATED_OPTIONS;
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

function isQuestionAnswered(
	question: ParsedQuestionCardQuestion,
	answers: ClarificationAnswers
): boolean {
	const answerValue = answers[question.id];
	if (answerValue === undefined) return false;
	if (typeof answerValue === "string") return answerValue.trim().length > 0;
	if (Array.isArray(answerValue)) return answerValue.length > 0;
	return false;
}

function QuestionOptionRow({
	label,
	description,
	selected,
	focused,
	index,
	disabled,
	onPress,
	onMouseEnter,
}: Readonly<{
	label: string;
	description?: string;
	selected: boolean;
	focused: boolean;
	index: number;
	disabled: boolean;
	onPress: () => void;
	onMouseEnter: () => void;
}>): React.ReactElement {
	return (
		<li>
			<button
				type="button"
				aria-pressed={selected}
				disabled={disabled}
				onClick={onPress}
				onMouseEnter={onMouseEnter}
				tabIndex={-1}
				className={cn(
					"flex w-full items-center gap-4 rounded-lg px-2 py-1.5 text-left disabled:cursor-not-allowed disabled:opacity-50",
					selected
						? "bg-bg-selected"
						: focused
							? "bg-bg-neutral-subtle-hovered"
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
	focusedIndex,
	customInputRef,
	onAnswerChange,
	onFocusIndex,
}: Readonly<{
	question: ParsedQuestionCardQuestion;
	isSubmitting: boolean;
	answerValue: ClarificationAnswerValue | undefined;
	focusedIndex: number;
	customInputRef: React.RefObject<HTMLInputElement | null>;
	onAnswerChange: (
		value: ClarificationAnswerValue,
		options?: Readonly<{ autoAdvance?: boolean }>
	) => void;
	onFocusIndex: (index: number) => void;
}>): React.ReactElement {
	const selectedValues = getSelectedValues(answerValue);
	const visibleOptions = question.options.slice(0, MAX_GENERATED_OPTIONS);
	const customInputValue = getCustomInputValue(question, answerValue);

	return (
		<ul className="m-0 flex list-none flex-col gap-1 p-0" role="listbox">
			{visibleOptions.map((option, index) => {
				const isSelected = selectedValues.includes(option.id);
				return (
					<QuestionOptionRow
						key={option.id}
						index={index}
						label={option.label}
						description={option.description}
						selected={isSelected}
						focused={focusedIndex === index}
						disabled={isSubmitting}
						onMouseEnter={() => onFocusIndex(index)}
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
			<li
				className="flex h-8 items-center gap-4 rounded-lg pl-2"
				onMouseEnter={() => {
					onFocusIndex(CUSTOM_OPTION_INDEX);
					customInputRef.current?.focus();
				}}
			>
				<span className="inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-border bg-surface text-sm leading-5 font-medium text-text">
					4
				</span>
				<Input
					ref={customInputRef}
					aria-label={`${question.label} custom answer`}
					value={customInputValue}
					onChange={(event) => onAnswerChange((event.target as HTMLInputElement).value)}
					onFocus={() => onFocusIndex(CUSTOM_OPTION_INDEX)}
					disabled={isSubmitting}
					placeholder={CUSTOM_OPTION_PLACEHOLDER}
					className="h-8 border-input bg-bg-input text-sm leading-5"
					tabIndex={-1}
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
	const cardRef = useRef<HTMLDivElement>(null);
	const customInputRef = useRef<HTMLInputElement>(null);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [answers, setAnswers] = useState<ClarificationAnswers>({});
	const [focusedIndex, setFocusedIndex] = useState(0);
	const [hasSkippedQuestions, setHasSkippedQuestions] = useState(false);
	const [visitedLastQuestion, setVisitedLastQuestion] = useState(false);

	const totalQuestions = questionCard.questions.length;
	const safeQuestionIndex = Math.min(Math.max(0, currentQuestionIndex), totalQuestions - 1);
	const currentQuestion = questionCard.questions[safeQuestionIndex];
	const canGoToPreviousQuestion = safeQuestionIndex > 0;
	const canGoToNextQuestion = safeQuestionIndex < totalQuestions - 1;
	const visibleOptionCount = Math.min(currentQuestion.options.length, MAX_GENERATED_OPTIONS);
	const totalOptionSlots = visibleOptionCount + 1; // +1 for custom input

	const allQuestionsAnswered = questionCard.questions.every((q) =>
		isQuestionAnswered(q, answers)
	);

	const needsManualSubmit = hasSkippedQuestions && visitedLastQuestion;
	const showSubmitButton = needsManualSubmit && !allQuestionsAnswered;

	// Auto-focus the card on mount
	useEffect(() => {
		cardRef.current?.focus();
	}, []);

	// Return focus to the card container when switching questions
	useEffect(() => {
		if (document.activeElement === customInputRef.current) {
			cardRef.current?.focus();
		}
	}, [safeQuestionIndex]);

	// Focus the custom input when keyboard navigation lands on option 4
	useEffect(() => {
		if (focusedIndex === CUSTOM_OPTION_INDEX) {
			customInputRef.current?.focus();
		}
	}, [focusedIndex]);

	const resetFocusForNewQuestion = useCallback(() => {
		setFocusedIndex(0);
	}, []);

	const goToNextQuestion = useCallback(() => {
		resetFocusForNewQuestion();
		setCurrentQuestionIndex((prev) => {
			const next = Math.min(totalQuestions - 1, prev + 1);
			if (next === totalQuestions - 1) {
				setVisitedLastQuestion(true);
			}
			return next;
		});
	}, [totalQuestions, resetFocusForNewQuestion]);

	const goToPreviousQuestion = useCallback(() => {
		resetFocusForNewQuestion();
		setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
	}, [resetFocusForNewQuestion]);

	const handleSkip = useCallback(() => {
		if (isSubmitting) return;

		if (canGoToNextQuestion) {
			setHasSkippedQuestions(true);
			goToNextQuestion();
		} else {
			// On the last question — skip means dismiss
			onDismiss?.();
		}
	}, [isSubmitting, canGoToNextQuestion, goToNextQuestion, onDismiss]);

	const handleSelectOption = useCallback(
		(optionId: string) => {
			if (isSubmitting) return;

			const nextAnswers = { ...answers, [currentQuestion.id]: optionId };
			setAnswers(nextAnswers);

			// Check if we should auto-advance or auto-submit
			if (canGoToNextQuestion) {
				goToNextQuestion();
			} else {
				// On last question — check for auto-submit
				const allAnswered = questionCard.questions.every((q) =>
					q.id === currentQuestion.id
						? true // just answered this one
						: isQuestionAnswered(q, nextAnswers)
				);
				if (allAnswered) {
					onSubmit(nextAnswers);
				} else {
					setVisitedLastQuestion(true);
					setHasSkippedQuestions(true);
				}
			}
		},
		[isSubmitting, answers, currentQuestion, canGoToNextQuestion, goToNextQuestion, questionCard, onSubmit]
	);

	const handleCustomInputSubmit = useCallback(
		(value: string) => {
			if (isSubmitting || !value.trim()) return;

			const nextAnswers = { ...answers, [currentQuestion.id]: value.trim() };
			setAnswers(nextAnswers);

			if (canGoToNextQuestion) {
				goToNextQuestion();
				// Return focus to card
				cardRef.current?.focus();
			} else {
				const allAnswered = questionCard.questions.every((q) =>
					q.id === currentQuestion.id
						? true
						: isQuestionAnswered(q, nextAnswers)
				);
				if (allAnswered) {
					onSubmit(nextAnswers);
				} else {
					setVisitedLastQuestion(true);
					setHasSkippedQuestions(true);
				}
			}
		},
		[isSubmitting, answers, currentQuestion, canGoToNextQuestion, goToNextQuestion, questionCard, onSubmit]
	);

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			if (isSubmitting) return;

			// If the custom input is focused, handle differently
			const isCustomInputFocused = document.activeElement === customInputRef.current;

			switch (event.key) {
				case "ArrowUp": {
					event.preventDefault();
					if (isCustomInputFocused) {
						cardRef.current?.focus();
					}
					setFocusedIndex((prev) => (prev <= 0 ? totalOptionSlots - 1 : prev - 1));
					break;
				}
				case "ArrowDown": {
					event.preventDefault();
					if (isCustomInputFocused) {
						cardRef.current?.focus();
					}
					setFocusedIndex((prev) => (prev >= totalOptionSlots - 1 ? 0 : prev + 1));
					break;
				}
				case "Enter": {
					if (isCustomInputFocused) {
						event.preventDefault();
						const inputValue = customInputRef.current?.value ?? "";
						handleCustomInputSubmit(inputValue);
						return;
					}

					event.preventDefault();
					if (focusedIndex < visibleOptionCount) {
						const option = currentQuestion.options[focusedIndex];
						if (option) {
							handleSelectOption(option.id);
						}
					} else if (focusedIndex === CUSTOM_OPTION_INDEX) {
						// Focus the custom input
						customInputRef.current?.focus();
					}
					break;
				}
				case "ArrowLeft": {
					if (isCustomInputFocused) return; // allow cursor movement in input
					event.preventDefault();
					if (canGoToPreviousQuestion) {
						goToPreviousQuestion();
					}
					break;
				}
				case "ArrowRight": {
					if (isCustomInputFocused) return;
					event.preventDefault();
					if (canGoToNextQuestion) {
						goToNextQuestion();
					}
					break;
				}
				case "Escape": {
					event.preventDefault();
					if (isCustomInputFocused) {
						// First escape exits the input
						cardRef.current?.focus();
						return;
					}
					onDismiss?.();
					break;
				}
			}
		},
		[
			isSubmitting,
			totalOptionSlots,
			focusedIndex,
			visibleOptionCount,
			currentQuestion,
			canGoToPreviousQuestion,
			canGoToNextQuestion,
			goToPreviousQuestion,
			goToNextQuestion,
			handleSelectOption,
			handleCustomInputSubmit,
			onDismiss,
		]
	);

	return (
		<div
			ref={cardRef}
			data-testid="clarification-question-card"
			tabIndex={0}
			role="dialog"
			aria-label={`Question ${safeQuestionIndex + 1} of ${totalQuestions}: ${currentQuestion.label}`}
			onKeyDown={handleKeyDown}
			className="mx-auto w-full max-w-[776px] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_-2px_50px_8px_rgba(30,31,33,0.08)] outline-none"
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
							tabIndex={-1}
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
					focusedIndex={focusedIndex}
					customInputRef={customInputRef}
					onFocusIndex={setFocusedIndex}
					onAnswerChange={(answerValue, options) => {
						if (isSubmitting) return;

						setAnswers((previousAnswers) => ({
							...previousAnswers,
							[currentQuestion.id]: answerValue,
						}));

						if (options?.autoAdvance && currentQuestion.kind === "single-select") {
							if (canGoToNextQuestion) {
								goToNextQuestion();
							} else {
								// Auto-submit check on last question
								const nextAnswers = {
									...answers,
									[currentQuestion.id]: answerValue,
								};
								const allAnswered = questionCard.questions.every((q) =>
									q.id === currentQuestion.id
										? true
										: isQuestionAnswered(q, nextAnswers)
								);
								if (allAnswered) {
									onSubmit(nextAnswers);
								} else {
									setVisitedLastQuestion(true);
									setHasSkippedQuestions(true);
								}
							}
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
						onClick={goToPreviousQuestion}
						tabIndex={-1}
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
						onClick={goToNextQuestion}
						tabIndex={-1}
						className="inline-flex size-5 items-center justify-center rounded text-icon-subtle hover:bg-bg-neutral-subtle-hovered disabled:cursor-not-allowed disabled:opacity-50"
					>
						<ChevronRightIcon label="Next question" size="small" />
					</button>
				</div>

				{showSubmitButton ? (
					<Button
						disabled={isSubmitting}
						onClick={() => onSubmit(answers)}
						tabIndex={-1}
					>
						{isSubmitting ? "Submitting..." : "Submit"}
					</Button>
				) : (
					<Button
						variant="outline"
						disabled={isSubmitting}
						onClick={handleSkip}
						tabIndex={-1}
					>
						Skip
					</Button>
				)}
			</footer>
		</div>
	);
}
