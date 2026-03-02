import { cva, type VariantProps } from "class-variance-authority"

import { token } from "@/lib/tokens"
import { cn } from "@/lib/utils"

const emptyVariants = cva(
	"flex min-w-0 flex-1 flex-col items-center justify-center text-center text-balance",
	{
		variants: {
			width: {
				wide: "max-w-[464px]",
				narrow: "max-w-[304px]",
			},
		},
		defaultVariants: {
			width: "wide",
		},
	}
)

interface EmptyProps
	extends React.ComponentProps<"div">,
		VariantProps<typeof emptyVariants> {}

function Empty({
	className,
	width = "wide",
	...props
}: Readonly<EmptyProps>) {
	return (
		<div
			data-slot="empty"
			className={cn(emptyVariants({ width }), "mx-auto gap-6 py-12", className)}
			{...props}
		/>
	)
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="empty-header"
			className={cn("flex flex-col items-center gap-2", className)}
			{...props}
		/>
	)
}

const emptyMediaVariants = cva(
	"mb-1 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default:
					"bg-transparent [&_img]:max-h-40 [&_img]:max-w-40 [&_img]:object-contain",
				icon: "bg-bg-neutral text-text flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-5",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	}
)

function EmptyMedia({
	className,
	variant = "default",
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
	return (
		<div
			data-slot="empty-icon"
			data-variant={variant}
			className={cn(emptyMediaVariants({ variant }), className)}
			{...props}
		/>
	)
}

const emptyTitleVariants = cva("text-text", {
	variants: {
		headingSize: {
			medium: "",
			xsmall: "text-sm font-semibold",
		},
	},
	defaultVariants: {
		headingSize: "medium",
	},
})

function EmptyTitle({
	className,
	headingSize = "medium",
	style,
	...props
}: React.ComponentProps<"h4"> &
	VariantProps<typeof emptyTitleVariants>) {
	return (
		<h4
			data-slot="empty-title"
			className={cn(emptyTitleVariants({ headingSize }), className)}
			style={
				headingSize === "medium"
					? { font: token("font.heading.medium"), ...style }
					: style
			}
			{...props}
		/>
	)
}

function EmptyDescription({
	className,
	...props
}: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="empty-description"
			className={cn(
				"text-sm/relaxed text-text-subtle [&>a:hover]:text-link-pressed [&>a]:text-link [&>a]:underline [&>a]:underline-offset-4",
				className
			)}
			{...props}
		/>
	)
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="empty-content"
			className={cn(
				"flex w-full min-w-0 flex-col items-center gap-2 text-sm",
				className
			)}
			{...props}
		/>
	)
}

export {
	Empty,
	EmptyHeader,
	EmptyTitle,
	EmptyDescription,
	EmptyContent,
	EmptyMedia,
	emptyVariants,
	emptyMediaVariants,
	emptyTitleVariants,
	type EmptyProps,
}
