"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@/lib/utils"

type ProgressVariant = "default" | "success" | "inverse"

export interface ProgressProps extends ProgressPrimitive.Root.Props {
	variant?: ProgressVariant
	isIndeterminate?: boolean
}

function Progress({
	className,
	children,
	value,
	variant = "default",
	isIndeterminate = false,
	...props
}: Readonly<ProgressProps>) {
	return (
		<ProgressPrimitive.Root
			value={isIndeterminate ? null : value ?? null}
			data-slot="progress"
			data-variant={variant}
			data-indeterminate={isIndeterminate}
			className={cn("flex flex-wrap gap-3 group/progress", className)}
			{...props}
		>
			{children}
			<ProgressTrack>
				<ProgressIndicator />
			</ProgressTrack>
		</ProgressPrimitive.Root>
	)
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
	return (
		<ProgressPrimitive.Track
			className={cn(
				"bg-muted h-1 rounded-full relative flex w-full items-center overflow-x-hidden",
				className
			)}
			data-slot="progress-track"
			{...props}
		/>
	)
}

function ProgressIndicator({
	className,
	...props
}: ProgressPrimitive.Indicator.Props) {
	return (
		<ProgressPrimitive.Indicator
			data-slot="progress-indicator"
			className={cn(
				"h-full transition-all",
				"group-data-[variant=default]/progress:bg-primary",
				"group-data-[variant=success]/progress:bg-success",
				"group-data-[variant=inverse]/progress:bg-foreground",
				"group-data-[indeterminate=true]/progress:animate-pulse",
				className
			)}
			{...props}
		/>
	)
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
	return (
		<ProgressPrimitive.Label
			className={cn("text-sm font-medium", className)}
			data-slot="progress-label"
			{...props}
		/>
	)
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
	return (
		<ProgressPrimitive.Value
			className={cn("text-muted-foreground ml-auto text-sm tabular-nums", className)}
			data-slot="progress-value"
			{...props}
		/>
	)
}

export {
	Progress,
	ProgressTrack,
	ProgressIndicator,
	ProgressLabel,
	ProgressValue,
}
