"use client";

import type { CSSProperties, ElementType, HTMLAttributes } from "react";
import { token } from "@/lib/tokens";

interface HeadingProps extends HTMLAttributes<HTMLElement> {
	as?: ElementType;
	size?: "xxsmall" | "xsmall" | "small" | "medium" | "large" | "xlarge" | "xxlarge";
}

const sizeMap: Record<NonNullable<HeadingProps["size"]>, string> = {
	xxsmall: "font.heading.xxsmall",
	xsmall: "font.heading.xsmall",
	small: "font.heading.small",
	medium: "font.heading.medium",
	large: "font.heading.large",
	xlarge: "font.heading.xlarge",
	xxlarge: "font.heading.xxlarge",
};

export default function Heading({
	as: Component = "h2",
	size = "medium",
	style,
	className,
	...props
}: Readonly<HeadingProps>) {
	const mergedStyle: CSSProperties = {
		font: token(sizeMap[size] as Parameters<typeof token>[0]),
		color: token("color.text"),
		...style,
	};

	return <Component style={mergedStyle} className={className} {...props} />;
}
