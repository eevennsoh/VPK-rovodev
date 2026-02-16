import * as React from "react"

import { cn } from "@/lib/utils"

export interface MenuGroupProps extends Omit<React.ComponentProps<"div">, "title"> {
	title?: React.ReactNode
}

function MenuGroup({ title, className, children, ...props }: Readonly<MenuGroupProps>) {
	return (
		<div data-slot="menu-group" className={cn("space-y-1", className)} {...props}>
			{title ? <div className="text-text-subtle px-2 py-1 text-xs font-medium">{title}</div> : null}
			<div className="space-y-1">{children}</div>
		</div>
	)
}

export { MenuGroup }
