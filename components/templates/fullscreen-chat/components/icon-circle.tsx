import { token } from "@/lib/tokens";

interface IconCircleProps {
	variant?: "neutral" | "selected";
	children: React.ReactNode;
}

export default function IconCircle({
	variant = "neutral",
	children,
}: Readonly<IconCircleProps>) {
	return (
		<div
			style={{
				width: "32px",
				height: "32px",
				borderRadius: token("radius.full"),
				backgroundColor: token(
					variant === "selected"
						? "color.background.selected"
						: "color.background.neutral"
				),
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			{children}
		</div>
	);
}
