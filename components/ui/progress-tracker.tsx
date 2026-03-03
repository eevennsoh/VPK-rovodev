import * as React from "react"

import CheckCircleIcon from "@atlaskit/icon/core/check-circle"
import NodeIcon from "@atlaskit/icon/core/node"

import { token } from "@/lib/tokens"
import { cn } from "@/lib/utils"

export interface ProgressTrackerStep {
	id: string
	label: string
	state?: "todo" | "current" | "done"
}

export interface ProgressTrackerProps extends React.ComponentProps<"ol"> {
	steps: ReadonlyArray<ProgressTrackerStep>
}

function StepIcon({ state }: Readonly<{ state: "todo" | "current" | "done" }>) {
	if (state === "done") {
		return <CheckCircleIcon label="" size="small" color={token("color.icon.success")} />
	}

	if (state === "current") {
		return (
			<div className="flex size-3 items-center justify-center">
				<div className="size-3 animate-spin rounded-full border border-border border-t-text-subtle" />
			</div>
		)
	}

	return <NodeIcon label="" size="small" color={token("color.icon.subtlest")} />
}

function ProgressTracker({ steps, className, ...props }: Readonly<ProgressTrackerProps>) {
	const stepKeys = React.useMemo(() => {
		const keyTotals = new Map<string, number>()
		const baseKeys = steps.map((step, index) => {
			const normalizedId = step.id.trim()
			const normalizedLabel = step.label.trim()
			const baseKey = normalizedId || normalizedLabel || `step-${index + 1}`
			keyTotals.set(baseKey, (keyTotals.get(baseKey) ?? 0) + 1)
			return baseKey
		})

		const seenCounts = new Map<string, number>()
		return baseKeys.map((baseKey) => {
			const seenCount = (seenCounts.get(baseKey) ?? 0) + 1
			seenCounts.set(baseKey, seenCount)
			return (keyTotals.get(baseKey) ?? 0) > 1 ? `${baseKey}-${seenCount}` : baseKey
		})
	}, [steps])

	return (
		<ol data-slot="progress-tracker" aria-label="Progress" className={cn("flex flex-col", className)} {...props}>
			{steps.map((step, index) => {
				const state = step.state ?? "todo"
				const isLast = index === steps.length - 1

				return (
					<li key={stepKeys[index]} className="flex gap-1">
						<div className="flex w-5 shrink-0 flex-col items-center">
							<div className="flex h-6 shrink-0 items-center justify-center">
								<StepIcon state={state} />
							</div>
							{!isLast ? <div className="min-h-4 w-px flex-1 bg-border" /> : null}
						</div>
						<span
							className={cn(
								"flex h-6 items-center px-1 text-xs leading-4",
								state === "done" && "text-text",
								state === "current" && "text-text font-medium",
								state === "todo" && "text-text-subtlest"
							)}
						>
							{step.label}
						</span>
					</li>
				)
			})}
		</ol>
	)
}

export { ProgressTracker }
