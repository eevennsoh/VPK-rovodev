import { cva, type VariantProps } from "class-variance-authority"
import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

const spinnerVariants = cva(
	"animate-spin pointer-events-none shrink-0",
	{
		variants: {
			size: {
				xs: "size-3",
				sm: "size-3.5",
				default: "size-4",
				lg: "size-5",
				xl: "size-6",
			},
			variant: {
				inherit: "",
				invert: "text-background",
			},
		},
		defaultVariants: {
			size: "default",
			variant: "inherit",
		},
	}
)

interface SpinnerProps
	extends Omit<React.ComponentProps<"svg">, "children">,
		VariantProps<typeof spinnerVariants> {
	label?: string
}

function Spinner({
	className,
	size = "default",
	variant = "inherit",
	label = "Loading",
	...props
}: Readonly<SpinnerProps>) {
	return (
		<Loader2Icon
			data-slot="spinner"
			role="status"
			aria-label={label}
			className={cn(spinnerVariants({ size, variant }), className)}
			{...props}
		/>
	)
}

export { Spinner, spinnerVariants, type SpinnerProps }
