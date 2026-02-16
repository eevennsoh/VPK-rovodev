import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

export type IconTileVariant =
	| "gray"
	| "blue"
	| "teal"
	| "green"
	| "lime"
	| "yellow"
	| "orange"
	| "red"
	| "magenta"
	| "purple"
	| "grayBold"
	| "blueBold"
	| "tealBold"
	| "greenBold"
	| "limeBold"
	| "yellowBold"
	| "orangeBold"
	| "redBold"
	| "magentaBold"
	| "purpleBold"

const ICON_TILE_VARIANTS: Record<IconTileVariant, string> = {
	// Subtle
	gray: "bg-neutral-50 text-neutral-600",
	blue: "bg-blue-50 text-blue-600",
	teal: "bg-teal-50 text-teal-600",
	green: "bg-green-50 text-green-600",
	lime: "bg-lime-50 text-lime-600",
	yellow: "bg-yellow-50 text-yellow-600",
	orange: "bg-orange-50 text-orange-600",
	red: "bg-red-50 text-red-600",
	magenta: "bg-pink-50 text-pink-600",
	purple: "bg-purple-50 text-purple-600",
	// Bold
	grayBold: "bg-neutral-600 text-white",
	blueBold: "bg-blue-600 text-white",
	tealBold: "bg-teal-600 text-white",
	greenBold: "bg-green-600 text-white",
	limeBold: "bg-lime-600 text-white",
	yellowBold: "bg-yellow-600 text-white",
	orangeBold: "bg-orange-600 text-white",
	redBold: "bg-red-600 text-white",
	magentaBold: "bg-pink-600 text-white",
	purpleBold: "bg-purple-600 text-white",
}

const iconTileVariants = cva(
	"inline-flex items-center justify-center overflow-hidden shrink-0",
	{
		variants: {
			size: {
				xsmall: "size-5 [&_svg]:size-3",
				small: "size-6 [&_svg]:size-3.5",
				medium: "size-8 [&_svg]:size-4",
				large: "size-10 [&_svg]:size-5",
				xlarge: "size-12 [&_svg]:size-6",
			},
			shape: {
				square: "rounded-tile",
				circle: "rounded-full!",
			},
		},
		defaultVariants: {
			size: "medium",
			shape: "square",
		},
	}
)

export interface IconTileProps
	extends Omit<React.ComponentProps<"div">, "children">,
		VariantProps<typeof iconTileVariants> {
	icon: React.ReactNode
	variant?: IconTileVariant
	label: string
}

function IconTile({
	icon,
	variant = "gray",
	label,
	size = "medium",
	shape = "square",
	className,
	...props
}: Readonly<IconTileProps>) {
	return (
		<div
			data-slot="icon-tile"
			aria-label={label}
			className={cn(
				iconTileVariants({ size, shape }),
				ICON_TILE_VARIANTS[variant],
				className
			)}
			{...props}
		>
			{icon}
		</div>
	)
}

export { IconTile, iconTileVariants }
