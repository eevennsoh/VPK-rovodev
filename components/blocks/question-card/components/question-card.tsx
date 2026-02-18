"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import {
	getCustomOptionIndex,
	getNextFocusedIndex,
	getTotalOptionSlots,
	getVisibleOptionCount,
} from "@/components/blocks/question-card/lib/option-slots";
import ChevronLeftIcon from "@atlaskit/icon/core/chevron-left";
import ChevronRightIcon from "@atlaskit/icon/core/chevron-right";
import CrossIcon from "@atlaskit/icon/core/cross";

export interface QuestionCardOption {
	id: string;
	label: string;
	description?: string;
}

export interface QuestionCardQuestion {
	id: string;
	label: string;
	kind: "single-select" | "multi-select" | "text";
	options: ReadonlyArray<QuestionCardOption>;
}

export type QuestionCardAnswerValue = string | string[];
export type QuestionCardAnswers = Record<string, QuestionCardAnswerValue>;

export interface QuestionCardProps {
	questions: ReadonlyArray<QuestionCardQuestion>;
	isSubmitting?: boolean;
	onSubmit: (answers: QuestionCardAnswers) => void;
	onDismiss?: () => void;
}

const MAX_GENERATED_OPTIONS = 3;
const CUSTOM_OPTION_PLACEHOLDER = "Tell Rovo what to do...";

function getSelectedValues(answerValue: QuestionCardAnswerValue | undefined): string[] {
	if (typeof answerValue === "string") {
		return answerValue.trim().length > 0 ? [answerValue] : [];
	}

	return Array.isArray(answerValue) ? answerValue : [];
}

function getCustomInputValue(question: QuestionCardQuestion, answerValue: QuestionCardAnswerValue | undefined): string {
	if (typeof answerValue !== "string") {
		return "";
	}

	const hasMatchingOption = question.options.some((option) => option.id === answerValue);
	return hasMatchingOption ? "" : answerValue;
}

function isQuestionAnswered(question: QuestionCardQuestion, answers: QuestionCardAnswers): boolean {
	const answerValue = answers[question.id];
	if (answerValue === undefined) return false;
	if (typeof answerValue === "string") return answerValue.trim().length > 0;
	if (Array.isArray(answerValue)) return answerValue.length > 0;
	return false;
}

function QuestionOptionRow({
	index,
	label,
	description,
	selected,
	focused,
	disabled,
	onPress,
	onMouseEnter,
}: Readonly<{
	index: number;
	label: string;
	description?: string;
	selected: boolean;
	focused: boolean;
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
					selected ? "bg-bg-selected" : focused ? "bg-bg-neutral-subtle-hovered" : disabled ? "bg-surface" : "bg-surface hover:bg-bg-neutral-subtle-hovered",
				)}
			>
				<span
					className={cn(
						"inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] border bg-surface text-sm leading-5 font-medium",
						selected ? "border-border-selected text-text-selected" : "border-border text-text",
					)}
				>
					{index + 1}
				</span>
				<span className="min-w-0 flex-1">
					<span className={cn("block truncate text-sm leading-5 font-medium", selected ? "text-text-selected" : "text-text")}>{label}</span>
					{description ? <span className={cn("block text-sm leading-5 font-normal", selected ? "text-text-selected" : "text-text-subtle")}>{description}</span> : null}
				</span>
			</button>
		</li>
	);
}

function QuestionInput({
	question,
	answerValue,
	focusedIndex,
	customOptionIndex,
	isSubmitting,
	customInputRef,
	onFocusIndex,
	onAnswerChange,
}: Readonly<{
	question: QuestionCardQuestion;
	answerValue: QuestionCardAnswerValue | undefined;
	focusedIndex: number;
	customOptionIndex: number;
	isSubmitting: boolean;
	customInputRef: React.RefObject<HTMLInputElement | null>;
	onFocusIndex: (index: number) => void;
	onAnswerChange: (value: QuestionCardAnswerValue, options?: Readonly<{ autoAdvance?: boolean }>) => void;
}>): React.ReactElement {
	const selectedValues = getSelectedValues(answerValue);
	const visibleOptionCount = getVisibleOptionCount(question.options.length, MAX_GENERATED_OPTIONS);
	const visibleOptions = question.options.slice(0, visibleOptionCount);
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

							const nextValues = isSelected ? selectedValues.filter((value) => value !== option.id) : [...selectedValues, option.id];
							onAnswerChange(nextValues);
						}}
					/>
				);
			})}
			<li
				className="flex h-8 items-center gap-4 rounded-lg pl-2"
				onMouseEnter={() => {
					onFocusIndex(customOptionIndex);
					customInputRef.current?.focus();
				}}
			>
				<span className="inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-border bg-surface text-sm leading-5 font-medium text-text">{customOptionIndex + 1}</span>
				<Input
					ref={customInputRef}
					aria-label={`${question.label} custom answer`}
					value={customInputValue}
					onChange={(event) => onAnswerChange((event.target as HTMLInputElement).value)}
					onFocus={() => onFocusIndex(customOptionIndex)}
					disabled={isSubmitting}
					placeholder={CUSTOM_OPTION_PLACEHOLDER}
					className="h-8 border-input bg-bg-input text-sm leading-5"
				/>
			</li>
		</ul>
	);
}

export function QuestionCard({ questions, isSubmitting = false, onSubmit, onDismiss }: Readonly<QuestionCardProps>): React.ReactElement {
	const cardRef = useRef<HTMLDivElement>(null);
	const customInputRef = useRef<HTMLInputElement>(null);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [answers, setAnswers] = useState<QuestionCardAnswers>({});
	const [focusedIndex, setFocusedIndex] = useState(0);
	const [hasSkippedQuestions, setHasSkippedQuestions] = useState(false);
	const [visitedLastQuestion, setVisitedLastQuestion] = useState(false);

	const totalQuestions = questions.length;
	const safeQuestionIndex = Math.min(Math.max(0, currentQuestionIndex), totalQuestions - 1);
	const currentQuestion = questions[safeQuestionIndex];
	const canGoToPreviousQuestion = safeQuestionIndex > 0;
	const canGoToNextQuestion = safeQuestionIndex < totalQuestions - 1;
	const visibleOptionCount = getVisibleOptionCount(currentQuestion.options.length, MAX_GENERATED_OPTIONS);
	const customOptionIndex = getCustomOptionIndex(visibleOptionCount);
	const totalOptionSlots = getTotalOptionSlots(visibleOptionCount);

	const allQuestionsAnswered = questions.every((question) => isQuestionAnswered(question, answers));

	const needsManualSubmit = hasSkippedQuestions && visitedLastQuestion;
	const showSubmitButton = needsManualSubmit && !allQuestionsAnswered;

	useEffect(() => {
		cardRef.current?.focus();
	}, []);

	useEffect(() => {
		if (document.activeElement === customInputRef.current) {
			cardRef.current?.focus();
		}
	}, [safeQuestionIndex]);

	useEffect(() => {
		if (focusedIndex === customOptionIndex) {
			customInputRef.current?.focus();
		}
	}, [focusedIndex, customOptionIndex]);

	const resetFocusForNewQuestion = useCallback(() => {
		setFocusedIndex(0);
	}, []);

	const goToNextQuestion = useCallback(() => {
		resetFocusForNewQuestion();
		setCurrentQuestionIndex((previous) => {
			const next = Math.min(totalQuestions - 1, previous + 1);
			if (next === totalQuestions - 1) {
				setVisitedLastQuestion(true);
			}
			return next;
		});
	}, [totalQuestions, resetFocusForNewQuestion]);

	const goToPreviousQuestion = useCallback(() => {
		resetFocusForNewQuestion();
		setCurrentQuestionIndex((previous) => Math.max(0, previous - 1));
	}, [resetFocusForNewQuestion]);

	const handleSkip = useCallback(() => {
		if (isSubmitting) return;

		if (canGoToNextQuestion) {
			setHasSkippedQuestions(true);
			goToNextQuestion();
		} else {
			onDismiss?.();
		}
	}, [isSubmitting, canGoToNextQuestion, goToNextQuestion, onDismiss]);

	const handleSelectOption = useCallback(
		(optionId: string) => {
			if (isSubmitting) return;

			const nextAnswers = { ...answers, [currentQuestion.id]: optionId };
			setAnswers(nextAnswers);

			if (canGoToNextQuestion) {
				goToNextQuestion();
				return;
			}

			const allAnswered = questions.every((question) => (question.id === currentQuestion.id ? true : isQuestionAnswered(question, nextAnswers)));
			if (allAnswered) {
				onSubmit(nextAnswers);
			} else {
				setVisitedLastQuestion(true);
				setHasSkippedQuestions(true);
			}
		},
		[isSubmitting, answers, currentQuestion, canGoToNextQuestion, goToNextQuestion, questions, onSubmit],
	);

	const handleCustomInputSubmit = useCallback(
		(value: string) => {
			if (isSubmitting || !value.trim()) return;

			const nextAnswers = { ...answers, [currentQuestion.id]: value.trim() };
			setAnswers(nextAnswers);

			if (canGoToNextQuestion) {
				goToNextQuestion();
				cardRef.current?.focus();
				return;
			}

			const allAnswered = questions.every((question) => (question.id === currentQuestion.id ? true : isQuestionAnswered(question, nextAnswers)));
			if (allAnswered) {
				onSubmit(nextAnswers);
			} else {
				setVisitedLastQuestion(true);
				setHasSkippedQuestions(true);
			}
		},
		[isSubmitting, answers, currentQuestion, canGoToNextQuestion, goToNextQuestion, questions, onSubmit],
	);

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			if (isSubmitting) return;

			const isCustomInputFocused = document.activeElement === customInputRef.current;
			switch (event.key) {
				case "ArrowUp": {
					event.preventDefault();
					if (isCustomInputFocused) {
						cardRef.current?.focus();
					}
					setFocusedIndex((previous) => getNextFocusedIndex(previous, totalOptionSlots, "up"));
					break;
				}
				case "ArrowDown": {
					event.preventDefault();
					if (isCustomInputFocused) {
						cardRef.current?.focus();
					}
					setFocusedIndex((previous) => getNextFocusedIndex(previous, totalOptionSlots, "down"));
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
					} else if (focusedIndex === customOptionIndex) {
						customInputRef.current?.focus();
					}
					break;
				}
				case "ArrowLeft": {
					if (isCustomInputFocused) return;
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
			customOptionIndex,
			currentQuestion,
			canGoToPreviousQuestion,
			canGoToNextQuestion,
			goToPreviousQuestion,
			goToNextQuestion,
			handleSelectOption,
			handleCustomInputSubmit,
			onDismiss,
		],
	);

	return (
		<div
			ref={cardRef}
			data-testid="question-card"
			tabIndex={0}
			role="dialog"
			aria-label={`Question ${safeQuestionIndex + 1} of ${totalQuestions}: ${currentQuestion.label}`}
			onKeyDown={handleKeyDown}
			className="mx-auto w-full max-w-[776px] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_-2px_50px_8px_rgba(30,31,33,0.08)] outline-none"
		>
			<header className="px-4 pb-2 pt-4">
				<div className="flex items-start justify-between gap-2">
					<h2 className="min-w-0 text-sm leading-5 font-medium text-text">{currentQuestion.label}</h2>
					{onDismiss ? (
						<Button aria-label="Dismiss questions" size="icon" variant="ghost" disabled={isSubmitting} className="-mr-1 -mt-1 shrink-0" onClick={onDismiss} tabIndex={-1}>
							<CrossIcon label="" size="small" />
						</Button>
					) : null}
				</div>
			</header>

			<div className="px-3 pb-4">
				<QuestionInput
					question={currentQuestion}
					answerValue={answers[currentQuestion.id]}
					focusedIndex={focusedIndex}
					customOptionIndex={customOptionIndex}
					isSubmitting={isSubmitting}
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
								const nextAnswers = {
									...answers,
									[currentQuestion.id]: answerValue,
								};
								const allAnswered = questions.every((question) => (question.id === currentQuestion.id ? true : isQuestionAnswered(question, nextAnswers)));
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
					<ProgressIndicator steps={totalQuestions} currentStep={safeQuestionIndex} size="md" />
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
					<Button disabled={isSubmitting} onClick={() => onSubmit(answers)} tabIndex={-1}>
						{isSubmitting ? "Submitting..." : "Submit"}
					</Button>
				) : (
					<Button variant="outline" disabled={isSubmitting} onClick={handleSkip} tabIndex={-1}>
						Skip
					</Button>
				)}
			</footer>
		</div>
	);
}
