"use client";

import Image from "next/image";
import Link from "next/link";
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
				{/* Left side - Back button (when in chat mode) and Rovo brand */}
				<div className="flex items-center gap-1">
					{isChatMode && (
						<Button aria-label="Back" size="icon" variant="ghost" onClick={onBackToStart}>
							<ArrowLeftIcon label="" />
						</Button>
					)}
					<Link
						href="/agents-team"
						className="flex items-center gap-2 rounded-md p-1 text-text no-underline transition-colors hover:bg-surface-hovered hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focused"
						aria-label="Go to agents team"
					>
						<Image src="/1p/rovo.svg" alt="" width={20} height={20} aria-hidden />
						<span
							style={{ font: token("font.heading.xsmall") }}
							className="text-text"
						>
							Rovo
						</span>
					</Link>
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
