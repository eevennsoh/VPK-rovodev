import * as React from "react";

import { cn } from "@/lib/utils";

type SkillTagColor = "blue" | "green" | "red" | "yellow" | "purple" | "teal";

const slashColorClasses: Record<SkillTagColor, string> = {
	blue: "bg-border-brand",
	green: "bg-border-success",
	red: "bg-border-danger",
	yellow: "bg-border-warning",
	purple: "bg-border-discovery",
	teal: "bg-border-information",
};

interface SkillTagProps extends Omit<React.ComponentProps<"span">, "color"> {
	icon?: React.ReactNode;
	color?: SkillTagColor;
}

function SkillTag({ children, icon, color = "blue", onClick, className, ...props }: Readonly<SkillTagProps>) {
	const isInteractive = Boolean(onClick);

	return (
		<span
			{...props}
			onClick={onClick}
			className={cn(
				"relative inline-flex h-5 -skew-x-12 items-center gap-1 rounded-sm bg-bg-neutral py-1 pr-1.5 pl-2.5 align-middle text-xs leading-4 font-normal text-text transition-colors",
				isInteractive ? "cursor-pointer hover:bg-bg-neutral-hovered active:bg-bg-neutral-pressed" : "cursor-default",
				className,
			)}
			data-slot="skill-tag"
		>
			{/* Colored slash bar */}
			<span className={cn("absolute top-0 bottom-0 left-0 z-[1] w-0.5 rounded-l-sm", slashColorClasses[color])} />

			{/* Icon */}
			{icon ? (
				<span className="flex size-3 shrink-0 skew-x-12 items-center justify-center text-text [&>svg]:size-3" data-slot="skill-tag-icon">
					{icon}
				</span>
			) : null}

			{/* Label */}
			<span className="skew-x-12 truncate whitespace-nowrap" data-slot="skill-tag-label">
				{children}
			</span>
		</span>
	);
}

type SkillTagGroupProps = React.ComponentProps<"div">;

function SkillTagGroup({ className, ...props }: Readonly<SkillTagGroupProps>) {
	return <div data-slot="skill-tag-group" className={cn("flex flex-wrap gap-1", className)} {...props} />;
}

export { SkillTag, SkillTagGroup, type SkillTagProps, type SkillTagGroupProps, type SkillTagColor };
