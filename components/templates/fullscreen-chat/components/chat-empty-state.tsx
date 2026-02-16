"use client";

import Image from "next/image";
import { token } from "@/lib/tokens";
import Heading from "@/components/blocks/shared-ui/heading";
import { ACTION_ITEMS } from "../data/chat-actions";
import type { PanelVariant } from "../types";

interface ChatEmptyStateProps {
	variant: PanelVariant;
	userName?: string;
}

export default function ChatEmptyState({
	variant,
	userName,
}: Readonly<ChatEmptyStateProps>) {
	return (
		<div
			style={{
				padding: "0 4px 20px",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: token("space.300"),
			}}
		>
			{variant === "sidepanel" ? (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: token("space.100"),
						padding: "8px 8px 8px 24px",
					}}
				>
					<Image
						src="/illustration-ai/chat/light.svg"
						alt="Chat"
						width={80}
						height={80}
					/>
					<Heading size="xlarge">
						{userName ? `How can I help, ${userName}?` : "How can I help?"}
					</Heading>
				</div>
			) : null}

			<div style={{ width: "100%" }}>
				<div className="flex flex-col gap-1">
					{ACTION_ITEMS.map((action) => {
						const IconComponent = action.icon;
						return (
							<button
								key={action.label}
								type="button"
								className="flex items-center gap-3 rounded-sm p-1.5 text-left hover:bg-bg-neutral-subtle-hovered"
								style={{ backgroundColor: token("elevation.surface") }}
							>
								<div
									style={{
										width: "32px",
										height: "32px",
										backgroundColor: token("elevation.surface"),
										borderRadius: token("radius.large"),
										border: `1px solid ${token("color.border")}`,
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										padding: "4px",
									}}
								>
									<IconComponent label={action.label} color={token("color.icon.subtle")} />
								</div>
								<span
									style={{
										font: token("font.body"),
										fontWeight: 400,
										color: token("color.text.subtle"),
									}}
								>
									{action.label}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}
