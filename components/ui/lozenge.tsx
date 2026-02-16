import type { ReactNode } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down"

import { Badge, type BadgeProps } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const metricVariantMap: Record<string, BadgeProps["variant"]> = {
	neutral: "neutral",
	success: "success",
	danger: "danger",
	information: "information",
	discovery: "discovery",
	warning: "warning",
}

const lozengeVariants = cva(
	"inline-flex w-fit shrink-0 items-center justify-center whitespace-nowrap overflow-hidden max-w-[200px] group/lozenge",
	{
		variants: {
			variant: {
				neutral: "bg-bg-neutral text-text-subtle",
				success: "bg-bg-success text-text-success",
				danger: "bg-bg-danger text-text-danger",
				information: "bg-bg-information text-text-information",
				discovery: "bg-bg-discovery text-text-discovery",
				warning: "bg-bg-warning text-text-warning",
				"accent-red": "bg-red-100 text-red-900",
				"accent-orange": "bg-orange-100 text-orange-900",
				"accent-yellow": "bg-yellow-100 text-yellow-900",
				"accent-lime": "bg-lime-100 text-lime-900",
				"accent-green": "bg-green-100 text-green-900",
				"accent-teal": "bg-teal-100 text-teal-900",
				"accent-blue": "bg-blue-100 text-blue-900",
				"accent-purple": "bg-purple-100 text-purple-900",
				"accent-magenta": "bg-pink-100 text-pink-900",
				"accent-gray": "bg-neutral-50 text-neutral-900",
			},
			size: {
				compact: "h-5 px-1 py-0.5 rounded-sm text-xs font-normal leading-4 gap-1 [&_svg]:size-3",
				spacious: "h-8 min-h-8 px-3 py-1 rounded-md text-sm font-medium leading-5 gap-1.5 [&_svg]:size-4",
			},
			isBold: {
				true: "",
				false: "",
			},
		},
		compoundVariants: [
			{
				variant: "neutral",
				isBold: true,
				className: "bg-bg-neutral-bold text-text-inverse",
			},
			{
				variant: "success",
				isBold: true,
				className: "bg-success text-success-foreground",
			},
			{
				variant: "danger",
				isBold: true,
				className: "bg-destructive text-destructive-foreground",
			},
			{
				variant: "information",
				isBold: true,
				className: "bg-info text-info-foreground",
			},
			{
				variant: "discovery",
				isBold: true,
				className: "bg-discovery text-discovery-foreground",
			},
			{
				variant: "warning",
				isBold: true,
				className: "bg-warning text-warning-foreground",
			},
		],
		defaultVariants: {
			variant: "neutral",
			size: "compact",
			isBold: false,
		},
	}
)

interface LozengeProps
	extends React.ComponentProps<"span">,
		VariantProps<typeof lozengeVariants> {
	maxWidth?: string | number
	icon?: ReactNode
	metric?: string | number
}

function Lozenge({
	className,
	variant = "neutral",
	size = "compact",
	isBold = false,
	maxWidth,
	icon,
	metric,
	children,
	style,
	...props
}: Readonly<LozengeProps>) {
	return (
		<span
			data-slot="lozenge"
			className={cn(
				lozengeVariants({ variant, size, isBold }),
				metric != null && size === "compact" && "pr-px",
				className,
			)}
			style={maxWidth != null ? { ...style, maxWidth } : style}
			{...props}
		>
			{icon}
			<span className="truncate">{children}</span>
			{metric != null && (
				<Badge variant={metricVariantMap[variant ?? "neutral"] ?? "neutral"} max={false}>
					{metric}
				</Badge>
			)}
		</span>
	)
}

const triggerBorderVariants = cva("border", {
	variants: {
		variant: {
			neutral: "border-border",
			success: "border-lime-200",
			danger: "border-red-200",
			information: "border-blue-200",
			discovery: "border-purple-200",
			warning: "border-orange-200",
			"accent-red": "border-red-200",
			"accent-orange": "border-orange-200",
			"accent-yellow": "border-yellow-200",
			"accent-lime": "border-lime-200",
			"accent-green": "border-green-200",
			"accent-teal": "border-teal-200",
			"accent-blue": "border-blue-200",
			"accent-purple": "border-purple-200",
			"accent-magenta": "border-pink-200",
			"accent-gray": "border-neutral-200",
		},
	},
	defaultVariants: { variant: "neutral" },
})

const triggerHoverVariants = cva("", {
	variants: {
		variant: {
			neutral: "hover:bg-bg-neutral-hovered",
			success: "hover:bg-bg-success-hovered",
			danger: "hover:bg-bg-danger-hovered",
			information: "hover:bg-bg-information-hovered",
			discovery: "hover:bg-bg-discovery-hovered",
			warning: "hover:bg-bg-warning-hovered",
			"accent-red": "hover:bg-red-200",
			"accent-orange": "hover:bg-orange-200",
			"accent-yellow": "hover:bg-yellow-200",
			"accent-lime": "hover:bg-lime-200",
			"accent-green": "hover:bg-green-200",
			"accent-teal": "hover:bg-teal-200",
			"accent-blue": "hover:bg-blue-200",
			"accent-purple": "hover:bg-purple-200",
			"accent-magenta": "hover:bg-pink-200",
			"accent-gray": "hover:bg-neutral-100",
		},
	},
	defaultVariants: { variant: "neutral" },
})

interface LozengeDropdownTriggerProps
	extends React.ComponentProps<"button">,
		VariantProps<typeof lozengeVariants> {
	icon?: ReactNode
	isSelected?: boolean
	maxWidth?: string | number
}

function LozengeDropdownTrigger({
	className,
	variant = "neutral",
	size = "compact",
	isBold = false,
	icon,
	isSelected,
	maxWidth,
	children,
	style,
	...props
}: Readonly<LozengeDropdownTriggerProps>) {
	return (
		<button
			type="button"
			data-slot="lozenge-dropdown-trigger"
			className={cn(
				lozengeVariants({ variant, size, isBold }),
				triggerBorderVariants({ variant }),
				triggerHoverVariants({ variant }),
				"cursor-pointer",
				"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3",
				isSelected && "ring-ring/50 ring-2",
				className,
			)}
			style={maxWidth != null ? { ...style, maxWidth } : style}
			{...props}
		>
			{icon}
			<span className="truncate">{children}</span>
			<ChevronDownIcon label="" size="small" />
		</button>
	)
}

export { Lozenge, LozengeDropdownTrigger, lozengeVariants, type LozengeProps, type LozengeDropdownTriggerProps }
