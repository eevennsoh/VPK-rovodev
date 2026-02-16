"use client";

import { token } from "@/lib/tokens";
import { Switch as Toggle } from "@/components/ui/switch";
import Heading from "@/components/blocks/shared-ui/heading";
import IconCircle from "./icon-circle";
import MenuItemButton from "./menu-item-button";
import AppsIcon from "@atlaskit/icon/core/apps";
import ChevronRightIcon from "@atlaskit/icon/core/chevron-right";
import GlobeIcon from "@atlaskit/icon/core/globe";
import OfficeBuildingIcon from "@atlaskit/icon/core/office-building";
import SettingsIcon from "@atlaskit/icon/core/settings";

interface SourcesSectionProps {
	webResultsEnabled: boolean;
	onWebResultsChange: (enabled: boolean) => void;
	companyKnowledgeEnabled: boolean;
	onCompanyKnowledgeChange: (enabled: boolean) => void;
	onClose: () => void;
}

export function SourcesSection({
	webResultsEnabled,
	onWebResultsChange,
	companyKnowledgeEnabled,
	onCompanyKnowledgeChange,
	onClose,
}: Readonly<SourcesSectionProps>) {
	return (
		<div style={{ marginBottom: token("space.200") }}>
			<div style={{ padding: `${token("space.100")} ${token("space.200")} 0` }}>
				<Heading size="xxsmall" color="color.text">Sources</Heading>
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
					highlighted={companyKnowledgeEnabled}
				/>
				<div style={{ height: "1px", backgroundColor: token("color.border"), margin: `0 ${token("space.200")}` }} />
				<MenuItemButton
					elemBefore={
						<IconCircle>
							<AppsIcon label="Filter by apps" />
						</IconCircle>
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
	highlighted?: boolean;
}

function SourceToggleRow({ icon, label, checked, onCheckedChange, highlighted }: Readonly<SourceToggleRowProps>) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				padding: token("space.150"),
				justifyContent: "space-between",
				backgroundColor: highlighted ? token("color.background.selected") : "transparent",
				borderRadius: highlighted ? `${token("radius.xlarge")} ${token("radius.xlarge")} 0 0` : undefined,
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: token("space.150") }}>
				<IconCircle variant={highlighted ? "selected" : "neutral"}>{icon}</IconCircle>
				<span style={{ font: token("font.body"), fontWeight: highlighted ? 500 : 400 }}>{label}</span>
			</div>
			<Toggle checked={checked} onCheckedChange={onCheckedChange} label={label} />
		</div>
	);
}

export function SettingsSection({ onClose }: Readonly<{ onClose: () => void }>) {
	return (
		<div style={{ backgroundColor: token("elevation.surface.sunken"), borderRadius: token("radius.xlarge") }}>
			<MenuItemButton
				elemBefore={
					<IconCircle>
						<SettingsIcon label="Settings" />
					</IconCircle>
				}
				elemAfter={<ChevronRightIcon label="Open settings" />}
				onClick={onClose}
			>
				Rovo settings
			</MenuItemButton>
		</div>
	);
}
