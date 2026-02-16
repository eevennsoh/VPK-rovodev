"use client";

import { useState } from "react";
import { token } from "@/lib/tokens";
import { Button } from "@/components/ui/button";
import LinkExternalIcon from "@atlaskit/icon/core/link-external";
import SmartLinkEmbedIcon from "@atlaskit/icon/core/smart-link-embed";
import { VARIANT_OPTIONS, type ChatVariant } from "../data/variant-options";

interface VariantMenuProps {
	variant: ChatVariant;
	onVariantChange: (variant: ChatVariant) => void;
	onFullScreen?: () => void;
}

function getItemBackground(isSelected: boolean, isHovered: boolean): string {
	if (isSelected) return token("color.background.selected");
	if (isHovered) return token("color.background.neutral.subtle.hovered");
	return "transparent";
}

export default function VariantMenu({
	variant,
	onVariantChange,
	onFullScreen,
}: Readonly<VariantMenuProps>) {
	const [isOpen, setIsOpen] = useState(false);
	const [hoveredItem, setHoveredItem] = useState<string | null>(null);

	function handleClose() {
		setIsOpen(false);
	}

	function handleItemClick(option: (typeof VARIANT_OPTIONS)[number]) {
		handleClose();
		if (option.isFullScreen) {
			onFullScreen?.();
		} else if (option.variant) {
			onVariantChange(option.variant);
		}
	}

	return (
		<div style={{ position: "relative" }}>
			<Button
				aria-label="Switch view"
				size="icon"
				variant="ghost"
				onClick={() => setIsOpen((prev) => !prev)}
			>
				<SmartLinkEmbedIcon label="" />
			</Button>

			{isOpen ? (
				<>
					<div
						style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 400 }}
						onClick={handleClose}
					/>
					<div
						style={{
							position: "absolute",
							top: "40px",
							right: "0",
							backgroundColor: token("elevation.surface.overlay"),
							borderRadius: token("radius.large"),
							boxShadow: token("elevation.shadow.overlay"),
							border: `1px solid ${token("color.border")}`,
							minWidth: "180px",
							zIndex: 500,
							padding: "4px",
						}}
					>
						<div style={{ padding: `${token("space.100")} ${token("space.150")} ${token("space.050")}` }}>
							<span className="text-xs font-semibold text-text-subtlest">Switch to</span>
						</div>

						{VARIANT_OPTIONS.map((option) => {
							const Icon = option.icon;
							const isSelected = !option.isFullScreen && variant === option.id;
							const isHovered = hoveredItem === option.id;

							return (
								<button
									key={option.id}
									type="button"
									className="flex w-full items-center justify-between gap-2 rounded-sm"
									style={{
										padding: `${token("space.100")} ${token("space.150")}`,
										cursor: "pointer",
										backgroundColor: getItemBackground(isSelected, isHovered),
									}}
									onClick={() => handleItemClick(option)}
									onMouseEnter={() => setHoveredItem(option.id)}
									onMouseLeave={() => setHoveredItem(null)}
								>
									<div className="flex items-center gap-2">
										<Icon label={option.label} />
										<span className={`text-sm${isSelected ? " font-medium" : ""}`}>{option.label}</span>
									</div>
									{option.isFullScreen && isHovered ? <LinkExternalIcon label="Open in new tab" /> : null}
								</button>
							);
						})}
					</div>
				</>
			) : null}
		</div>
	);
}
