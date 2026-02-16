import * as React from "react"

import { cn } from "@/lib/utils"

export interface ProgressIndicatorProps extends React.ComponentProps<"ol"> {
	steps: number
	currentStep: number
}

function ProgressIndicator({ steps, currentStep, className, ...props }: Readonly<ProgressIndicatorProps>) {
	return (
		<ol
			data-slot="progress-indicator"
			aria-label="Progress"
			className={cn("flex items-center gap-2", className)}
			{...props}
		>
			{Array.from({ length: steps }, (_, index) => {
				const isComplete = index < currentStep
				const isCurrent = index === currentStep

				return (
					<li
						key={index}
						data-complete={isComplete}
						data-current={isCurrent}
						className={cn(
							"size-2.5 rounded-full border",
							isComplete && "border-primary bg-primary",
							!isComplete && !isCurrent && "border-border bg-bg-neutral",
							isCurrent && "border-primary bg-surface"
						)}
					/>
				)
			})}
		</ol>
	)
}

export { ProgressIndicator }
