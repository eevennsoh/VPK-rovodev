"use client";

import { token } from "@/lib/tokens";
import Image from "next/image";

interface ProjectItemProps {
	name: string;
	imageSrc: string;
	isSelected?: boolean;
	onClick?: () => void;
}

export function ProjectItem({
	name,
	imageSrc,
	isSelected = false,
	onClick,
}: Readonly<ProjectItemProps>) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				padding: token("space.050"),
				borderRadius: token("radius.xsmall"),
				cursor: "pointer",
				backgroundColor: isSelected
					? token("color.background.selected")
					: "transparent",
				position: "relative",
				gap: token("space.025"),
				minHeight: "32px",
			}}
			onClick={onClick}
		>
			{isSelected && (
				<div
					style={{
						position: "absolute",
						left: 0,
						top: "50%",
						transform: "translateY(-50%)",
						width: "2px",
						height: "12px",
						backgroundColor: token("color.border.selected"),
						borderRadius: token("radius.xsmall"),
					}}
				/>
			)}

			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					width: "24px",
					height: "24px",
					marginLeft: token("space.025"),
					borderRadius: token("radius.small"),
					overflow: "hidden",
				}}
			>
				<Image src={imageSrc} alt="" width={24} height={24} />
			</div>

			<span
				style={{
					font: token("font.body"),
					fontWeight: token("font.weight.medium"),
					color: isSelected
						? token("color.text.selected")
						: token("color.text.subtle"),
					flex: 1,
					paddingLeft: token("space.025"),
					overflow: "hidden",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
				}}
			>
				{name}
			</span>
		</div>
	);
}
