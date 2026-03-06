"use client";

import { token } from "@/lib/tokens";
import Heading from "@/components/blocks/shared-ui/heading";
import { REASONING_OPTIONS } from "../data/customize-menu-options";
import IconCircle from "./icon-circle";
import MenuItemButton from "./menu-item-button";
import AddIcon from "@atlaskit/icon/core/add";

interface ReasoningSectionProps {
	selectedReasoning: string;
	onReasoningChange: (reasoning: string) => void;
	onClose: () => void;
}

export default function ReasoningSection({
	selectedReasoning,
	onReasoningChange,
	onClose,
}: Readonly<ReasoningSectionProps>) {
	return (
		<div style={{ marginBottom: token("space.200") }}>
			<div style={{ padding: `${token("space.100")} ${token("space.200")} 0` }}>
				<Heading size="xxsmall" color="color.text">Reasoning</Heading>
			</div>
			<div
				style={{
					backgroundColor: token("elevation.surface.sunken"),
					borderRadius: token("radius.xlarge"),
					marginTop: token("space.100"),
				}}
			>
				{REASONING_OPTIONS.map((option) => {
					const IconComponent = option.icon;
					const isSelected = selectedReasoning === option.id;
					return (
						<div
							key={option.id}
							style={{
								backgroundColor: isSelected ? token("color.background.selected") : "transparent",
							}}
						>
							<MenuItemButton
								elemBefore={
									<IconCircle variant={isSelected ? "selected" : "neutral"}>
										<span className={isSelected ? "text-icon-selected" : ""}>
											<IconComponent label={option.label} />
										</span>
									</IconCircle>
								}
								elemAfter={option.id === "deep-research" && isSelected ? <AddIcon label="Selected" /> : null}
								description={option.description}
								onClick={() => {
									onReasoningChange(option.id);
									onClose();
								}}
							>
								{option.label}
							</MenuItemButton>
						</div>
					);
				})}
			</div>
		</div>
	);
}
