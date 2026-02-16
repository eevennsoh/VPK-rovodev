"use client";

import { token } from "@/lib/tokens";
import { Button } from "@/components/ui/button";
import { RovoIcon } from "@/components/ui/logo";
import { useRovoChat } from "@/app/contexts";
import VariantMenu from "./variant-menu";
import CrossIcon from "@atlaskit/icon/core/cross";
import EditIcon from "@atlaskit/icon/core/edit";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import ShowMoreHorizontalIcon from "@atlaskit/icon/core/show-more-horizontal";
import type { PanelVariant } from "../types";

interface RovoChatHeaderProps {
	onClose: () => void;
	variant: PanelVariant;
	onVariantChange: (variant: PanelVariant) => void;
	onFullScreen?: () => void;
}

export default function RovoChatHeader({
	onClose,
	variant,
	onVariantChange,
	onFullScreen,
}: Readonly<RovoChatHeaderProps>) {
	const { resetChat } = useRovoChat();

	return (
		<div
			className="rovo-chat-panel"
			style={{
				padding: token("space.150"),
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: token("space.100"),
					padding: token("space.050"),
				}}
			>
				<RovoIcon label="Rovo" size="small" />
				<span
					style={{
						font: token("font.body"),
						fontWeight: token("font.weight.semibold"),
						color: token("color.text"),
					}}
				>
					Rovo
				</span>
				<div style={{ width: "12px", height: "12px", display: "flex", alignItems: "center" }}>
					<ChevronDownIcon label="Expand" size="small" />
				</div>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: token("space.050") }}>
				<Button
					aria-label="New chat"
					size="icon"
					variant="ghost"
					onClick={resetChat}
				>
					<EditIcon label="" />
				</Button>
				<VariantMenu
					variant={variant}
					onVariantChange={onVariantChange}
					onFullScreen={onFullScreen}
				/>
				<Button aria-label="More" size="icon" variant="ghost">
					<ShowMoreHorizontalIcon label="" />
				</Button>
				<Button aria-label="Close" size="icon" variant="ghost" onClick={onClose}>
					<CrossIcon label="" />
				</Button>
			</div>
		</div>
	);
}
