import * as React from "react"

import { cn } from "@/lib/utils"

export interface BlanketProps extends React.ComponentProps<"div"> {
	isTinted?: boolean
}

function Blanket({ className, isTinted = true, ...props }: Readonly<BlanketProps>) {
	return (
		<div
			data-slot="blanket"
			data-tinted={isTinted}
			className={cn(
				"fixed inset-0 z-40",
				"data-[tinted=true]:bg-blanket",
				"data-[tinted=false]:bg-transparent",
				className
			)}
			{...props}
		/>
	)
}

export { Blanket }
