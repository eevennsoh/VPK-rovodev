"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import CloseIcon from "@atlaskit/icon/core/close";
import type { PlanApprovalDecision, PlanApprovalSelection } from "@/components/templates/shared/lib/plan-approval";
import { APPROVAL_OPTIONS } from "./data/options";

const MAX_GENERATED_OPTIONS = APPROVAL_OPTIONS.length;
const CUSTOM_OPTION_INDEX = MAX_GENERATED_OPTIONS;
const TOTAL_OPTION_SLOTS = MAX_GENERATED_OPTIONS + 1;
const CUSTOM_STEP_LABEL = String(MAX_GENERATED_OPTIONS + 1);

interface ApprovalCardProps {
	onSubmit?: (selection: PlanApprovalSelection) => void;
	onDismiss?: () => void;
	isSubmitting?: boolean;
}

export function ApprovalCard({ onSubmit, onDismiss, isSubmitting = false }: Readonly<ApprovalCardProps>) {
	const cardRef = useRef<HTMLDivElement>(null);
	const customInputRef = useRef<HTMLInputElement>(null);
	const [selectedId, setSelectedId] = useState<PlanApprovalDecision | null>(APPROVAL_OPTIONS.find((o) => o.selected)?.id ?? null);
	const [focusedIndex, setFocusedIndex] = useState(0);
	const [customValue, setCustomValue] = useState("");

	useEffect(() => {
		cardRef.current?.focus();
	}, []);

	useEffect(() => {
		if (focusedIndex === CUSTOM_OPTION_INDEX) {
			customInputRef.current?.focus();
		}
	}, [focusedIndex]);

	const handleDismiss = useCallback(() => {
		if (onDismiss) {
			onDismiss();
			return;
		}

		setSelectedId(null);
		setCustomValue("");
		setFocusedIndex(0);
		cardRef.current?.focus();
	}, [onDismiss]);

	const handleSelectOption = useCallback((id: PlanApprovalDecision) => {
		setSelectedId(id);
		setCustomValue("");
	}, []);

	const handleSubmit = useCallback(() => {
		if (!onSubmit) return;

		const isCustom = customValue.trim().length > 0;
		const decision: PlanApprovalDecision = isCustom ? "custom" : (selectedId ?? "auto-accept");
		const canSubmit = !isCustom || customValue.trim().length > 0;
		if (!canSubmit) return;

		onSubmit({
			decision,
			customInstruction: isCustom ? customValue.trim() : undefined,
		});
	}, [onSubmit, selectedId, customValue]);

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			const isCustomInputFocused = document.activeElement === customInputRef.current;

			switch (event.key) {
				case "ArrowUp": {
					event.preventDefault();
					if (isCustomInputFocused) {
						cardRef.current?.focus();
					}
					setFocusedIndex((previous) => (previous <= 0 ? TOTAL_OPTION_SLOTS - 1 : previous - 1));
					break;
				}
				case "ArrowDown": {
					event.preventDefault();
					if (isCustomInputFocused) {
						cardRef.current?.focus();
					}
					setFocusedIndex((previous) => (previous >= TOTAL_OPTION_SLOTS - 1 ? 0 : previous + 1));
					break;
				}
				case "Enter": {
					if (isCustomInputFocused) {
						event.preventDefault();
						handleSubmit();
						return;
					}

					event.preventDefault();
					if (focusedIndex < MAX_GENERATED_OPTIONS) {
						const option = APPROVAL_OPTIONS[focusedIndex];
						if (option) {
							handleSelectOption(option.id);
							if (onSubmit) {
								onSubmit({
									decision: option.id,
									customInstruction: undefined,
								});
							}
						}
					} else if (focusedIndex === CUSTOM_OPTION_INDEX) {
						customInputRef.current?.focus();
					}
					break;
				}
				case "Escape": {
					event.preventDefault();
					if (isCustomInputFocused) {
						cardRef.current?.focus();
						return;
					}
					handleDismiss();
					break;
				}
			}
		},
		[focusedIndex, handleSelectOption, handleSubmit, handleDismiss, onSubmit],
	);

	const isCustomSelected = customValue.trim().length > 0;

	return (
		<div
			ref={cardRef}
			data-testid="approval-card"
			tabIndex={0}
			role="dialog"
			aria-label="Accept this plan?"
			onKeyDown={handleKeyDown}
			className="mx-auto w-full max-w-[776px] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_-2px_50px_8px_rgba(30,31,33,0.08)] outline-none"
		>
			<header className="px-4 pt-4">
				<div className="flex h-6 items-center justify-between gap-3">
					<h2 className="text-sm leading-5 font-semibold text-text">Accept this plan?</h2>
					<button
						type="button"
						aria-label="Close approval card"
						onClick={handleDismiss}
						disabled={isSubmitting}
						tabIndex={-1}
						className="inline-flex size-6 shrink-0 items-center justify-center rounded text-icon-subtle hover:bg-bg-neutral-subtle-hovered active:bg-bg-neutral-subtle-pressed disabled:cursor-not-allowed disabled:opacity-60"
					>
						<CloseIcon label="" size="small" />
					</button>
				</div>
			</header>

			<div className="px-3 pt-3 pb-4">
				<ul className="m-0 flex list-none flex-col gap-1 p-0" role="listbox">
					{APPROVAL_OPTIONS.map((option, index) => {
						const isSelected = selectedId === option.id && !isCustomSelected;
						return (
							<li key={option.id}>
								<button
									type="button"
									aria-pressed={isSelected}
									disabled={isSubmitting}
									onClick={() => {
										handleSelectOption(option.id);
										setFocusedIndex(index);
										if (onSubmit) {
											onSubmit({
												decision: option.id,
												customInstruction: undefined,
											});
										}
									}}
									onMouseEnter={() => setFocusedIndex(index)}
									tabIndex={-1}
									className={cn(
										"flex w-full items-center gap-4 rounded-lg px-2 py-1.5 text-left disabled:cursor-not-allowed disabled:opacity-60",
										isSelected ? "bg-bg-selected" : focusedIndex === index ? "bg-bg-neutral-subtle-hovered" : "bg-surface hover:bg-bg-neutral-subtle-hovered",
									)}
								>
									<span
										className={cn(
											"inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] border bg-surface text-sm leading-5 font-medium",
											isSelected ? "border-border-selected text-text-selected" : "border-border text-text",
										)}
									>
										{option.step}
									</span>
									<p className={cn("text-sm leading-5 font-medium", isSelected ? "text-text-selected" : "text-text")}>{option.label}</p>
								</button>
							</li>
						);
					})}

					<li
						className="flex h-8 items-center gap-4 rounded-lg pl-2"
						onMouseEnter={() => {
							setFocusedIndex(CUSTOM_OPTION_INDEX);
							customInputRef.current?.focus();
						}}
					>
						<span className="inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-border bg-surface text-sm leading-5 font-medium text-text">{CUSTOM_STEP_LABEL}</span>
						<Input
							ref={customInputRef}
							aria-label="Custom answer"
							value={customValue}
							disabled={isSubmitting}
							onChange={(event) => setCustomValue((event.target as HTMLInputElement).value)}
							onFocus={() => setFocusedIndex(CUSTOM_OPTION_INDEX)}
							placeholder="Tell Rovo what to do..."
							className="h-8 border-input bg-bg-input text-sm leading-5"
							tabIndex={-1}
						/>
					</li>
				</ul>
			</div>

			{onSubmit ? (
				<footer className="flex items-center justify-end border-t border-border px-4 py-3">
					{isCustomSelected ? (
						<Button type="button" disabled={isSubmitting} onClick={handleSubmit}>
							{isSubmitting ? "Submitting..." : "Submit"}
						</Button>
					) : (
						<Button type="button" variant="outline" disabled={isSubmitting} onClick={handleDismiss}>
							Skip
						</Button>
					)}
				</footer>
			) : null}
		</div>
	);
}

export default function ApprovalCardPreview() {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [key, setKey] = useState(0);
	const submitTimeoutRef = useRef<number | null>(null);

	useEffect(
		() => () => {
			if (submitTimeoutRef.current !== null) {
				window.clearTimeout(submitTimeoutRef.current);
			}
		},
		[],
	);

	const handleSubmit = useCallback(
		() => {
			if (isSubmitting) return;

			setIsSubmitting(true);
			if (submitTimeoutRef.current !== null) {
				window.clearTimeout(submitTimeoutRef.current);
			}
			submitTimeoutRef.current = window.setTimeout(() => {
				setIsSubmitting(false);
				submitTimeoutRef.current = null;
			}, 600);
		},
		[isSubmitting],
	);

	const handleDismiss = useCallback(() => {
		if (submitTimeoutRef.current !== null) {
			window.clearTimeout(submitTimeoutRef.current);
			submitTimeoutRef.current = null;
		}
		setIsSubmitting(false);
		setKey((previous) => previous + 1);
	}, []);

	return <ApprovalCard key={key} onSubmit={handleSubmit} onDismiss={handleDismiss} isSubmitting={isSubmitting} />;
}
