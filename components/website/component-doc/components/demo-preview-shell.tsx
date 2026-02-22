import type { ReactNode } from "react";
import { token } from "@/lib/tokens";

const DEMO_SHELL_MIN_HEIGHT_PX = 400;
const DEMO_SHELL_PADDING_PX = 24;
const DEMO_CONTENT_MIN_HEIGHT_PX = DEMO_SHELL_MIN_HEIGHT_PX - DEMO_SHELL_PADDING_PX * 2;

interface DemoPreviewShellProps {
	children: ReactNode;
}

export function DemoPreviewShell({ children }: Readonly<DemoPreviewShellProps>) {
	return (
		<div
			style={{
				width: "100%",
				maxWidth: "100%",
				border: `1px solid ${token("color.border")}`,
				borderRadius: token("radius.large"),
				backgroundColor: token("elevation.surface"),
				overflow: "auto",
			}}
		>
			<div
				style={{
					display: "flex",
					width: "100%",
					minHeight: DEMO_SHELL_MIN_HEIGHT_PX,
					padding: DEMO_SHELL_PADDING_PX,
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<div
					style={{
						display: "flex",
						flex: 1,
						width: "100%",
						minWidth: "100%",
						maxWidth: "100%",
						minHeight: DEMO_CONTENT_MIN_HEIGHT_PX,
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					{children}
				</div>
			</div>
		</div>
	);
}
