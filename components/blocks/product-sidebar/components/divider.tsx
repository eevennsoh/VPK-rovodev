"use client";

import { token } from "@/lib/tokens";

export function Divider() {
	return (
		<div
			style={{
				height: "1px",
				backgroundColor: token("color.border"),
				margin: `${token("space.100")} 0`,
			}}
		/>
	);
}
