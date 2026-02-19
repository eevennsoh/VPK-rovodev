"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface MenuItemButtonProps extends React.ComponentProps<"button"> {
	elemBefore?: React.ReactNode;
	elemAfter?: React.ReactNode;
	description?: string;
	children: React.ReactNode;
}

export default function MenuItemButton({
	className,
	elemBefore,
	elemAfter,
	description,
	children,
	...props
}: Readonly<MenuItemButtonProps>) {
	return (
		<button
			type="button"
			className={cn(
				"flex w-full cursor-default items-center gap-3 rounded-md px-3 py-3 text-sm text-left outline-hidden select-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			{...props}
		>
			{elemBefore ? (
				<span className="flex size-8 items-center justify-center text-text-subtle">{elemBefore}</span>
			) : null}
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="truncate">{children}</span>
				{description ? <span className="text-text-subtle text-xs">{description}</span> : null}
			</span>
			{elemAfter ? <span className="ml-auto flex items-center">{elemAfter}</span> : null}
		</button>
	);
}
