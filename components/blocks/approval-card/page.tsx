"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import CloseIcon from "@atlaskit/icon/core/close";
import { APPROVAL_OPTIONS } from "./data/options";

export default function ApprovalCard() {
	return (
		<div
			data-testid="approval-card"
			className="mx-auto w-full max-w-[776px] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_-2px_50px_8px_rgba(30,31,33,0.08)]"
		>
			<header className="px-4 pt-4">
				<div className="flex h-6 items-center justify-between gap-3">
					<h2 className="text-sm leading-5 font-semibold text-text">Accept this plan?</h2>
					<button
						type="button"
						aria-label="Close approval card"
						className="inline-flex size-6 shrink-0 items-center justify-center rounded text-icon-subtle hover:bg-bg-neutral-subtle-hovered active:bg-bg-neutral-subtle-pressed"
					>
						<CloseIcon label="" size="small" />
					</button>
				</div>
			</header>

			<div className="px-3 pt-3 pb-4">
				<ul className="m-0 flex list-none flex-col gap-1 p-0">
					{APPROVAL_OPTIONS.map((option) => (
						<li
							key={option.id}
							className={cn(
								"flex h-8 items-center gap-4 rounded-lg px-2 py-1.5",
								option.selected
									? "bg-bg-selected text-text-selected"
									: "bg-surface text-text",
							)}
						>
							<span
								className={cn(
									"inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] border text-sm leading-5 font-medium",
									option.selected
										? "border-border-selected bg-surface text-text-selected"
										: "border-border bg-surface text-text",
								)}
							>
								{option.id}
							</span>
							<p className="text-sm leading-5 font-medium">{option.label}</p>
						</li>
					))}

					<li className="flex h-8 items-center gap-4 rounded-lg pl-2">
						<span className="inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-border bg-surface text-sm leading-5 font-medium text-text">
							4
						</span>
						<Input
							aria-label="Custom answer"
							placeholder="Tell Rovo what to do..."
							className="h-8 border-input bg-bg-input text-sm leading-5"
						/>
					</li>
				</ul>
			</div>
		</div>
	);
}
