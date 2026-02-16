"use client";

import { token } from "@/lib/tokens";
import { Switch as Toggle } from "@/components/ui/switch";
import { MenuItemButton, CircleIcon } from "./components/menu-item-button";
import {
	REASONING_OPTIONS,
	FILTER_BY_APPS_ICON,
	SETTINGS_ICON,
	SELECTED_CHECK_ICON,
} from "./data/customize-menu-data";
import ChevronRightIcon from "@atlaskit/icon/core/chevron-right";
import GlobeIcon from "@atlaskit/icon/core/globe";
import OfficeBuildingIcon from "@atlaskit/icon/core/office-building";

export interface CustomizeMenuProps {
	selectedReasoning: string;
	onReasoningChange: (reasoning: string) => void;
	webResultsEnabled: boolean;
	onWebResultsChange: (enabled: boolean) => void;
	companyKnowledgeEnabled: boolean;
	onCompanyKnowledgeChange: (enabled: boolean) => void;
	onClose: () => void;
}

export default function CustomizeMenu({
	selectedReasoning,
	onReasoningChange,
	webResultsEnabled,
	onWebResultsChange,
	companyKnowledgeEnabled,
	onCompanyKnowledgeChange,
	onClose,
}: Readonly<CustomizeMenuProps>) {
	return (
		<>
			<ReasoningSection
				selectedReasoning={selectedReasoning}
				onReasoningChange={onReasoningChange}
				onClose={onClose}
			/>
			<SourcesSection
				webResultsEnabled={webResultsEnabled}
				onWebResultsChange={onWebResultsChange}
				companyKnowledgeEnabled={companyKnowledgeEnabled}
				onCompanyKnowledgeChange={onCompanyKnowledgeChange}
				onClose={onClose}
			/>
			<SettingsSection onClose={onClose} />
		</>
	);
}

interface ReasoningSectionProps {
	selectedReasoning: string;
	onReasoningChange: (reasoning: string) => void;
	onClose: () => void;
}

function ReasoningSection({ selectedReasoning, onReasoningChange, onClose }: Readonly<ReasoningSectionProps>) {
	return (
		<div style={{ marginBottom: token("space.200") }}>
			<div style={{ padding: `${token("space.050")} ${token("space.200")} 0` }}>
				<h3 style={{ font: token("font.heading.xxsmall") }} className="text-text">
					Reasoning
				</h3>
			</div>
			<div
				style={{
					backgroundColor: token("elevation.surface.sunken"),
					borderRadius: token("radius.xlarge"),
					marginTop: token("space.100"),
				}}
			>
				{REASONING_OPTIONS.map((option) => (
					<div key={option.id} style={{ paddingTop: token("space.100"), paddingBottom: token("space.100") }}>
						<MenuItemButton
							elemBefore={
								<CircleIcon isSelected={selectedReasoning === option.id}>
									{option.icon}
								</CircleIcon>
							}
							elemAfter={option.showCheckAfter && selectedReasoning === option.id ? SELECTED_CHECK_ICON : null}
							description={option.description}
							onClick={() => {
								onReasoningChange(option.id);
								onClose();
							}}
						>
							{option.label}
						</MenuItemButton>
					</div>
				))}
			</div>
		</div>
	);
}

interface SourcesSectionProps {
	webResultsEnabled: boolean;
	onWebResultsChange: (enabled: boolean) => void;
	companyKnowledgeEnabled: boolean;
	onCompanyKnowledgeChange: (enabled: boolean) => void;
	onClose: () => void;
}

function SourcesSection({
	webResultsEnabled,
	onWebResultsChange,
	companyKnowledgeEnabled,
	onCompanyKnowledgeChange,
	onClose,
}: Readonly<SourcesSectionProps>) {
	return (
		<div style={{ marginBottom: token("space.200") }}>
			<div style={{ padding: `${token("space.100")} ${token("space.200")} 0` }}>
				<h3 style={{ font: token("font.heading.xxsmall") }} className="text-text">
					Sources
				</h3>
			</div>
			<div
				style={{
					backgroundColor: token("elevation.surface.sunken"),
					borderRadius: token("radius.xlarge"),
					marginTop: token("space.100"),
				}}
			>
					<SourceToggleRow
						icon={<GlobeIcon label="Web results" />}
						label="Include web results"
						checked={webResultsEnabled}
						onCheckedChange={() => onWebResultsChange(!webResultsEnabled)}
					/>

					<SourceToggleRow
						icon={<OfficeBuildingIcon label="Company knowledge" />}
						label="Search company knowledge"
						checked={companyKnowledgeEnabled}
						onCheckedChange={() => onCompanyKnowledgeChange(!companyKnowledgeEnabled)}
						isHighlighted={companyKnowledgeEnabled}
					/>

				<div
					style={{
						height: "1px",
						backgroundColor: token("color.border"),
						margin: `0 ${token("space.200")}`,
					}}
				/>

				<MenuItemButton
					elemBefore={
						<CircleIcon>{FILTER_BY_APPS_ICON}</CircleIcon>
					}
					onClick={onClose}
				>
					Filter by apps
				</MenuItemButton>
			</div>
		</div>
	);
}

interface SourceToggleRowProps {
	icon: React.ReactNode;
	label: string;
	checked: boolean;
	onCheckedChange: () => void;
	isHighlighted?: boolean;
}

function SourceToggleRow({ icon, label, checked, onCheckedChange, isHighlighted = false }: Readonly<SourceToggleRowProps>) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				padding: token("space.150"),
				justifyContent: "space-between",
				backgroundColor: isHighlighted ? token("color.background.selected") : "transparent",
				borderRadius: isHighlighted ? `${token("radius.xlarge")} ${token("radius.xlarge")} 0 0` : undefined,
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: token("space.150") }}>
				<CircleIcon isSelected={isHighlighted}>{icon}</CircleIcon>
				<span
					style={{
						font: token("font.body"),
						fontWeight: isHighlighted ? 500 : 400,
					}}
				>
					{label}
				</span>
			</div>
			<Toggle checked={checked} onCheckedChange={onCheckedChange} label={label} />
		</div>
	);
}

interface SettingsSectionProps {
	onClose: () => void;
}

function SettingsSection({ onClose }: Readonly<SettingsSectionProps>) {
	return (
		<div
			style={{
				backgroundColor: token("elevation.surface.sunken"),
				borderRadius: token("radius.xlarge"),
			}}
		>
			<MenuItemButton
				elemBefore={
					<CircleIcon>{SETTINGS_ICON}</CircleIcon>
				}
				elemAfter={<ChevronRightIcon label="Open settings" />}
				onClick={onClose}
			>
				Rovo settings
			</MenuItemButton>
		</div>
	);
}
