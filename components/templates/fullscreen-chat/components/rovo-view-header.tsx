"use client";

import { token } from "@/lib/tokens";
import { Button } from "@/components/ui/button";
import ArrowLeftIcon from "@atlaskit/icon/core/arrow-left";
import EditIcon from "@atlaskit/icon/core/edit";
import ShowMoreHorizontalIcon from "@atlaskit/icon/core/show-more-horizontal";

interface RovoViewHeaderProps {
	isChatMode: boolean;
	onBackToStart: () => void;
}

export default function RovoViewHeader({
	isChatMode,
	onBackToStart,
}: Readonly<RovoViewHeaderProps>) {
	return (
		<div
			style={{
				position: isChatMode ? "static" : "absolute",
				top: isChatMode ? "auto" : 0,
				left: 0,
				right: 0,
				height: "56px",
				padding: `0 ${token("space.100")}`,
				backgroundColor: token("elevation.surface"),
				flexShrink: 0,
			}}
		>
			<div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: token("space.050") }}>
				{/* Left side - Back button (when in chat mode) */}
				<div className="flex items-center gap-1">
					{isChatMode && (
						<Button aria-label="Back" size="icon" variant="ghost" onClick={onBackToStart}>
							<ArrowLeftIcon label="" />
						</Button>
					)}
				</div>

				{/* Right side - New chat and More buttons */}
				<div className="flex items-center gap-1">
					<Button aria-label="New chat" size="icon" variant="ghost" onClick={onBackToStart}>
						<EditIcon label="" />
					</Button>
					<Button aria-label="More options" size="icon" variant="ghost">
						<ShowMoreHorizontalIcon label="" />
					</Button>
				</div>
			</div>
		</div>
	);
}
