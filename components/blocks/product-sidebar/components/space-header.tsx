"use client";

import { token } from "@/lib/tokens";
import Image from "next/image";
import ShowMoreHorizontalIcon from "@atlaskit/icon/core/show-more-horizontal";

interface SpaceHeaderProps {
	name: string;
	imageSrc: string;
}

export function SpaceHeader({ name, imageSrc }: Readonly<SpaceHeaderProps>) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				padding: token("space.050"),
				borderRadius: token("radius.xsmall"),
				cursor: "pointer",
				gap: token("space.025"),
				minHeight: "32px",
			}}
		>
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
				<Image src={imageSrc} alt="" width={20} height={20} />
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

			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: token("space.050"),
					marginRight: token("space.025"),
				}}
			>
				<ShowMoreHorizontalIcon
					label="More"
					color={token("color.icon.subtle")}
					size="small"
				/>
			</div>
		</div>
	);
}
