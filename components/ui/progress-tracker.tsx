import * as React from "react"

import { cn } from "@/lib/utils"

export interface ProgressTrackerStep {
	id: string
	label: string
	state?: "todo" | "current" | "done"
}

export interface ProgressTrackerProps extends React.ComponentProps<"ol"> {
	steps: ReadonlyArray<ProgressTrackerStep>
}

function ProgressTracker({ steps, className, ...props }: Readonly<ProgressTrackerProps>) {
	return (
		<ol data-slot="progress-tracker" aria-label="Progress" className={cn("grid gap-2", className)} {...props}>
			{steps.map((step) => (
				<li key={step.id} className="flex items-center gap-2 text-sm">
					<span
						className={cn(
							"size-2.5 rounded-full border",
							step.state === "done" && "border-primary bg-primary",
							step.state === "current" && "border-primary bg-surface",
							(!step.state || step.state === "todo") && "border-border bg-bg-neutral"
						)}
					/>
					<span className={cn(step.state === "current" ? "text-text font-medium" : "text-text-subtle")}>{step.label}</span>
				</li>
			))}
		</ol>
	)
}

export { ProgressTracker }
