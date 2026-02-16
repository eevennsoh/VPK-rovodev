import * as React from "react"

import { RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface RadioProps extends React.ComponentProps<typeof RadioGroupItem> {
	label?: React.ReactNode
}

function Radio({ label, id, className, ...props }: Readonly<RadioProps>) {
	if (!label) {
		return <RadioGroupItem id={id} className={className} {...props} />
	}

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<RadioGroupItem id={id} {...props} />
			<Label htmlFor={id}>{label}</Label>
		</div>
	)
}

export { Radio }
