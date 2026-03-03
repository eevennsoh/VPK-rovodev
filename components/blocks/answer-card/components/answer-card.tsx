"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnswerCardRow {
	question: string;
	answer: string;
}

export interface AnswerCardProps extends Omit<ComponentProps<"section">, "children"> {
	/** Label displayed as the section header. @default "Requirements captured" */
	label?: string;
	/** Ordered list of question/answer pairs to display. */
	rows: ReadonlyArray<AnswerCardRow>;
}

// ---------------------------------------------------------------------------
// AnswerCard
// ---------------------------------------------------------------------------

function AnswerCard({
	label = "Requirements captured",
	rows,
	className,
	...props
}: Readonly<AnswerCardProps>): React.ReactElement {
	return (
		<section
			data-slot="answer-card"
			className={cn(
				"w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-text shadow-sm",
				className,
			)}
			{...props}
		>
			<p className="text-[11px] font-semibold tracking-wide text-text-subtle uppercase">
				{label}
			</p>
			<div className="mt-3 space-y-2">
				{rows.map((row, index) => (
					<div
						key={`${row.question}-${index}`}
						className="rounded-md border border-border-subtle bg-surface px-3 py-2"
					>
						<p className="text-xs font-medium text-text-subtle">
							{row.question}
						</p>
						<p className="mt-1 text-sm text-text">{row.answer}</p>
					</div>
				))}
			</div>
		</section>
	);
}

export { AnswerCard };
