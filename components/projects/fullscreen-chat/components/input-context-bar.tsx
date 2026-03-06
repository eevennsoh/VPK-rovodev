"use client";

import { token } from "@/lib/tokens";
import { Tag } from "@/components/ui/tag";
import BoardIcon from "@atlaskit/icon/core/board";
import LocationIcon from "@atlaskit/icon/core/location";
import PageIcon from "@atlaskit/icon/core/page";

interface InputContextBarProps {
	product: "jira" | "confluence";
}

export default function InputContextBar({ product }: Readonly<InputContextBarProps>) {
	return (
		<div
			className="bg-bg-neutral py-1 px-3"
			style={{
				borderRadius: token("radius.xlarge"),
				marginBottom: token("space.150"),
			}}
		>
			<div className="flex items-center gap-1">
				<LocationIcon label="Context" size="small" color={token("color.icon.subtlest")} />
				<span className="text-xs text-text-subtle">
					Context:
				</span>
				<Tag
					color="blue"
					elemBefore={
						product === "confluence" ? (
							<PageIcon label="Page" size="small" color={token("color.icon.brand")} />
						) : (
							<BoardIcon label="Board" size="small" color={token("color.icon.brand")} />
						)
					}
				>
					{product === "confluence" ? "Demo Live page" : "Vitafleet Q4 launch"}
				</Tag>
			</div>
		</div>
	);
}
