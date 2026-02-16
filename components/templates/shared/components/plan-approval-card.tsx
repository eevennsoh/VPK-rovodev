"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import CrossIcon from "@atlaskit/icon/core/cross";
import type {
	PlanApprovalDecision,
	PlanApprovalSelection,
} from "@/components/templates/shared/lib/plan-approval";

interface PlanApprovalCardProps {
	onSubmit: (selection: PlanApprovalSelection) => void;
	isSubmitting?: boolean;
	onDismiss?: () => void;
}

interface ApprovalOption {
	id: PlanApprovalDecision;
	step: string;
	label: string;
}

const APPROVAL_OPTIONS: ReadonlyArray<ApprovalOption> = [
	{ id: "auto-accept", step: "1", label: "Yes, let's cook!" },
	{ id: "continue-planning", step: "2", label: "No, keep planning" },
];
const CUSTOM_OPTION_ID: PlanApprovalDecision = "custom";
const CUSTOM_OPTION_LABEL = "3";
const CUSTOM_OPTION_PLACEHOLDER = "Tell Rovo what to do...";

export function PlanApprovalCard({
	onSubmit,
	isSubmitting = false,
	onDismiss,
}: Readonly<PlanApprovalCardProps>): React.ReactElement {
	const [selectedOptionId, setSelectedOptionId] = useState<PlanApprovalDecision>(
		APPROVAL_OPTIONS[0]?.id ?? "auto-accept"
	);
	const [customAnswer, setCustomAnswer] = useState("");
	const isCustomSelected = selectedOptionId === CUSTOM_OPTION_ID;
	const canSubmit = !isCustomSelected || customAnswer.trim().length > 0;

	return (
		<div
			data-testid="plan-approval-card"
			className="mx-auto w-full max-w-[776px] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_-2px_50px_8px_rgba(30,31,33,0.08)]"
		>
			<header className="px-4 pt-4">
				<div className="flex h-6 items-center justify-between gap-3">
					<h2 className="text-sm leading-5 font-semibold text-text">Accept this plan?</h2>
					{onDismiss ? (
						<Button
							type="button"
							aria-label="Close approval card"
							size="icon"
							variant="ghost"
							className="size-6"
							disabled={isSubmitting}
							onClick={onDismiss}
						>
							<CrossIcon label="Close approval card" size="small" />
						</Button>
					) : null}
				</div>
			</header>

			<div className="px-3 pt-3 pb-4">
				<ul className="m-0 flex list-none flex-col gap-1 p-0">
					{APPROVAL_OPTIONS.map((option) => {
						const isSelected = selectedOptionId === option.id;

						return (
							<li key={option.id}>
								<button
									type="button"
									aria-pressed={isSelected}
									disabled={isSubmitting}
									className={cn(
										"flex h-8 w-full items-center gap-4 rounded-lg px-2 py-1.5 text-left disabled:cursor-not-allowed disabled:opacity-60",
										isSelected
											? "bg-bg-selected text-text-selected"
											: "bg-surface text-text hover:bg-bg-neutral-subtle-hovered"
									)}
									onClick={() => setSelectedOptionId(option.id)}
								>
									<span
										className={cn(
											"inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] border text-sm leading-5 font-medium",
											isSelected
												? "border-border-selected bg-surface text-text-selected"
												: "border-border bg-surface text-text"
										)}
									>
										{option.step}
									</span>
									<p className="text-sm leading-5 font-medium">{option.label}</p>
								</button>
							</li>
						);
					})}

					<li
						className={cn(
							"flex h-8 items-center gap-4 rounded-lg pl-2",
							isCustomSelected ? "bg-bg-selected" : null
						)}
					>
						<span
							className={cn(
								"inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] border text-sm leading-5 font-medium",
								isCustomSelected
									? "border-border-selected bg-surface text-text-selected"
									: "border-border bg-surface text-text"
							)}
						>
							{CUSTOM_OPTION_LABEL}
						</span>
						<Input
							aria-label="Custom approval answer"
							value={customAnswer}
							placeholder={CUSTOM_OPTION_PLACEHOLDER}
							className="h-8 border-input bg-bg-input text-sm leading-5"
							disabled={isSubmitting}
							onFocus={() => setSelectedOptionId(CUSTOM_OPTION_ID)}
							onChange={(event) => {
								setCustomAnswer(event.currentTarget.value);
								setSelectedOptionId(CUSTOM_OPTION_ID);
							}}
						/>
					</li>
				</ul>
			</div>

			<footer className="flex items-center justify-end border-t border-border px-4 py-3">
				<Button
					type="button"
					disabled={!canSubmit || isSubmitting}
					onClick={() =>
						onSubmit({
							decision: selectedOptionId,
							customInstruction: isCustomSelected
								? customAnswer.trim()
								: undefined,
						})
					}
				>
					{isSubmitting ? "Submitting..." : "Submit approval"}
				</Button>
			</footer>
		</div>
	);
}
