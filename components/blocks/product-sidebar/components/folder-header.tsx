"use client";

import { token } from "@/lib/tokens";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import FolderOpenIcon from "@atlaskit/icon/core/folder-open";

interface FolderHeaderProps {
	name: string;
	isExpanded?: boolean;
	onClick?: () => void;
}

export function FolderHeader({
	name,
	isExpanded = true,
	onClick,
}: Readonly<FolderHeaderProps>) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				padding: token("space.050"),
				borderRadius: token("radius.xsmall"),
				cursor: "pointer",
				backgroundColor: "transparent",
				position: "relative",
				gap: token("space.025"),
				minHeight: "32px",
				marginLeft: "-16px",
			}}
			onClick={onClick}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					width: "24px",
					height: "24px",
					marginLeft: token("space.025"),
					transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
					transition: "transform var(--duration-normal) var(--ease-out)",
				}}
			>
				<ChevronDownIcon
					label={isExpanded ? "Collapse" : "Expand"}
					color={token("color.icon.subtle")}
					size="small"
				/>
			</div>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<FolderOpenIcon label={name} color={token("color.icon.subtle")} />
			</div>

			<span
				style={{
					font: token("font.body"),
					fontWeight: token("font.weight.medium"),
					color: token("color.text.subtle"),
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
