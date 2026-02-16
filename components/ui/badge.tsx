import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
	"inline-flex h-4 min-w-6 w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap overflow-hidden rounded-xs px-1 text-xs leading-4 font-normal has-data-[icon=inline-end]:pr-0.5 has-data-[icon=inline-start]:pl-0.5 [&>svg]:size-3! [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3 group/badge",
	{
		variants: {
			variant: {
				default:
					"bg-surface-pressed text-foreground disabled:pointer-events-none disabled:bg-bg-disabled disabled:text-text-disabled",
				neutral:
					"bg-surface-pressed text-foreground disabled:pointer-events-none disabled:bg-bg-disabled disabled:text-text-disabled",
				secondary:
					"bg-bg-neutral text-text-subtle disabled:pointer-events-none disabled:bg-bg-disabled disabled:text-text-disabled",
				destructive:
					"bg-bg-danger-subtler text-text-danger-bolder disabled:pointer-events-none disabled:bg-bg-disabled disabled:text-text-disabled",
				danger:
					"bg-bg-danger-subtler text-text-danger-bolder disabled:pointer-events-none disabled:bg-bg-disabled disabled:text-text-disabled",
				success:
					"bg-bg-success-subtler text-text-success-bolder disabled:pointer-events-none disabled:bg-bg-disabled disabled:text-text-disabled",
				added:
					"bg-bg-success-subtler text-text-success-bolder disabled:pointer-events-none disabled:bg-bg-disabled disabled:text-text-disabled",
				warning:
					"bg-bg-warning-subtler text-text-warning-bolder disabled:pointer-events-none disabled:bg-bg-disabled disabled:text-text-disabled",
				info: "bg-bg-information-subtler text-text-information-bolder disabled:pointer-events-none disabled:bg-bg-disabled disabled:text-text-disabled",
				information:
					"bg-bg-information-subtler text-text-information-bolder disabled:pointer-events-none disabled:bg-bg-disabled disabled:text-text-disabled",
				primary:
					"bg-bg-information-subtler text-text-information-bolder disabled:pointer-events-none disabled:bg-bg-disabled disabled:text-text-disabled",
				discovery:
					"bg-bg-discovery-subtler text-text-discovery-bolder disabled:pointer-events-none disabled:bg-bg-disabled disabled:text-text-disabled",
				inverse:
					"bg-text-inverse text-foreground disabled:pointer-events-none disabled:bg-bg-disabled disabled:text-text-disabled",
				primaryInverted:
					"bg-text-inverse text-foreground disabled:pointer-events-none disabled:bg-bg-disabled disabled:text-text-disabled",
				removed:
					"bg-bg-danger-subtler text-text-danger-bolder disabled:pointer-events-none disabled:bg-bg-disabled disabled:text-text-disabled",
				outline:
					"border border-border text-foreground disabled:pointer-events-none disabled:opacity-(--opacity-disabled)",
				ghost:
					"text-foreground disabled:pointer-events-none disabled:opacity-(--opacity-disabled)",
				link: "text-link underline-offset-4 hover:underline active:text-link-pressed disabled:pointer-events-none disabled:opacity-(--opacity-disabled)",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	}
)

function getCappedValue(
	children: BadgeProps["children"],
	max: BadgeProps["max"]
): BadgeProps["children"] {
	if (typeof max !== "number" || !Number.isFinite(max)) {
		return children
	}

	if (typeof children === "number") {
		return children > max ? `${max}+` : children
	}

	if (typeof children === "string") {
		const trimmedChildren = children.trim()

		if (!/^\d+$/.test(trimmedChildren)) {
			return children
		}

		const numericValue = Number.parseInt(trimmedChildren, 10)
		return numericValue > max ? `${max}+` : children
	}

	return children
}

export interface BadgeProps
	extends useRender.ComponentProps<"span">,
		VariantProps<typeof badgeVariants> {
	max?: number | false
}

function Badge({
	className,
	variant = "default",
	max = 99,
	children,
	render,
	...props
}: Readonly<BadgeProps>) {
	return useRender({
		defaultTagName: "span",
		props: mergeProps<"span">(
			{
				className: cn(badgeVariants({ className, variant })),
				children: getCappedValue(children, max),
			},
			props
		),
		render,
		state: {
			slot: "badge",
			variant,
		},
	})
}

export { Badge, badgeVariants }
