"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ChevronLeftIcon from "@atlaskit/icon/core/chevron-left";
import ChevronRightIcon from "@atlaskit/icon/core/chevron-right";
import CrossIcon from "@atlaskit/icon/core/cross";
import { CHOICE_OPTIONS } from "./data/options";

export default function QuestionCard() {
	return (
		<div data-testid="question-card" className="mx-auto w-full max-w-[776px] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_-2px_50px_8px_rgba(30,31,33,0.08)]">
			<header className="px-4 pt-4">
				<div className="flex h-6 items-center justify-between gap-3">
					<h2 className="text-sm leading-5 font-semibold text-text">How should teams participate?</h2>
					<button
						type="button"
						aria-label="Close question card"
						className="inline-flex size-6 shrink-0 items-center justify-center rounded text-icon-subtle hover:bg-bg-neutral-subtle-hovered active:bg-bg-neutral-subtle-pressed"
					>
						<CrossIcon label="" size="small" />
					</button>
				</div>
			</header>

			<div className="px-3 pt-3 pb-4">
				<ul className="m-0 flex list-none flex-col gap-1 p-0">
					{CHOICE_OPTIONS.map((option) => (
						<li key={option.id} className={cn("flex h-[52px] items-center gap-4 rounded-lg px-2 py-1.5", option.selected ? "bg-bg-neutral-hovered" : "bg-surface")}>
							<span className="inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-border bg-surface text-sm leading-5 font-medium text-text">{option.id}</span>
							<div className="min-w-0 flex-1">
								<p className="text-sm leading-5 font-medium text-text">{option.label}</p>
								<p className={cn("text-sm leading-5 font-normal", option.selected ? "text-text-subtle" : "text-text-subtlest")}>{option.description}</p>
							</div>
						</li>
					))}

					<li className="flex h-8 items-center gap-4 rounded-lg pl-2">
						<span className="inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-border bg-surface text-sm leading-5 font-medium text-text">4</span>
						<Input aria-label="Custom answer" placeholder="Tell Rovo what to do..." className="h-8 border-input bg-bg-input text-sm leading-5" />
					</li>
				</ul>
			</div>

			<footer className="flex h-16 items-center justify-between border-t border-border p-4">
				<div className="flex items-center gap-2">
					<button
						type="button"
						aria-label="Previous question"
						className="inline-flex size-5 items-center justify-center rounded text-icon-subtle hover:bg-bg-neutral-subtle-hovered active:bg-bg-neutral-subtle-pressed"
					>
						<ChevronLeftIcon label="" size="small" />
					</button>
					<span className="size-2 rounded-full bg-bg-neutral-bold" />
					<span className="size-2 rounded-full border border-border-bold" />
					<span className="size-2 rounded-full border border-border-bold" />
					<button
						type="button"
						aria-label="Next question"
						className="inline-flex size-5 items-center justify-center rounded text-icon-subtle hover:bg-bg-neutral-subtle-hovered active:bg-bg-neutral-subtle-pressed"
					>
						<ChevronRightIcon label="" size="small" />
					</button>
				</div>

				<Button disabled>Submit</Button>
			</footer>
		</div>
	);
}
