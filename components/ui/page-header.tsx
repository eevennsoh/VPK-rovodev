import * as React from "react"

import { cn } from "@/lib/utils"

export interface PageHeaderProps extends Omit<React.ComponentProps<"header">, "title"> {
	title: React.ReactNode
	description?: React.ReactNode
	actions?: React.ReactNode
	breadcrumbs?: React.ReactNode
}

function PageHeader({
	title,
	description,
	actions,
	breadcrumbs,
	className,
	...props
}: Readonly<PageHeaderProps>) {
	return (
		<header data-slot="page-header" className={cn("space-y-2", className)} {...props}>
			{breadcrumbs ? <div>{breadcrumbs}</div> : null}
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="space-y-1">
					<h1 className="text-text text-2xl font-semibold tracking-tight">{title}</h1>
					{description ? <p className="text-text-subtle text-sm">{description}</p> : null}
				</div>
				{actions ? <div className="flex items-center gap-2">{actions}</div> : null}
			</div>
		</header>
	)
}

export { PageHeader }
