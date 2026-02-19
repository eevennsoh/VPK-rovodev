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

export function SourcesSection({ webResultsEnabled, onWebResultsChange, companyKnowledgeEnabled, onCompanyKnowledgeChange, onClose }: Readonly<SourcesSectionProps>) {
	return (
		<div style={{ marginBottom: token("space.200") }}>
			<div style={{ padding: `${token("space.100")} ${token("space.200")} 0` }}>
				<Heading size="xxsmall" color="color.text">
					Sources
				</Heading>
			</div>
			<div
				style={{
					backgroundColor: token("elevation.surface.sunken"),
					borderRadius: token("radius.xlarge"),
					marginTop: token("space.100"),
				}}
			>
				<SourceToggleRow icon={<GlobeIcon label="Web results" />} label="Include web results" checked={webResultsEnabled} onCheckedChange={() => onWebResultsChange(!webResultsEnabled)} />
				<SourceToggleRow
					icon={<OfficeBuildingIcon label="Company knowledge" />}
					label="Search company knowledge"
					checked={companyKnowledgeEnabled}
					onCheckedChange={() => onCompanyKnowledgeChange(!companyKnowledgeEnabled)}
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
}

function SourceToggleRow({ icon, label, checked, onCheckedChange }: Readonly<SourceToggleRowProps>) {
	return (
		<div
			role="button"
			tabIndex={0}
			onClick={onCheckedChange}
			onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onCheckedChange(); } }}
			className="flex w-full cursor-default items-center justify-between select-none outline-hidden hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
			style={{
				padding: token("space.150"),
				backgroundColor: checked ? token("color.background.selected") : undefined,
				borderRadius: checked ? `${token("radius.xlarge")} ${token("radius.xlarge")} 0 0` : undefined,
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: token("space.150") }}>
				<IconCircle variant={checked ? "selected" : "neutral"}>{icon}</IconCircle>
				<span style={{ font: token("font.body") }}>{label}</span>
			</div>
			<Toggle
				checked={checked}
				onCheckedChange={onCheckedChange}
				label={label}
				onClick={(e) => e.stopPropagation()}
			/>
		</div>
	);
}
