"use client";

import AddIcon from "@atlaskit/icon/core/add";
import CheckCircleIcon from "@atlaskit/icon/core/check-circle";
import EditIcon from "@atlaskit/icon/core/edit";
import HomeIcon from "@atlaskit/icon/core/home";
import SearchIcon from "@atlaskit/icon/core/search";
import SettingsIcon from "@atlaskit/icon/core/settings";
import { Icon } from "@/components/ui/icon";

export default function IconDemo() {
	return (
		<div className="flex items-center gap-3">
			<Icon render={<SearchIcon label="" />} label="Search" />
			<Icon render={<AddIcon label="" />} label="Add" />
			<Icon render={<EditIcon label="" />} label="Edit" />
			<Icon render={<SettingsIcon label="" />} label="Settings" />
		</div>
	);
}

export function IconDemoDefault() {
	return <Icon render={<SearchIcon label="" />} label="Search" />;
}

export function IconDemoMultiple() {
	return (
		<div className="flex items-center gap-3">
			<Icon render={<SearchIcon label="" />} label="Search" />
			<Icon render={<AddIcon label="" />} label="Add" />
			<Icon render={<EditIcon label="" />} label="Edit" />
			<Icon render={<SettingsIcon label="" />} label="Settings" />
			<Icon render={<HomeIcon label="" />} label="Home" />
			<Icon render={<CheckCircleIcon label="" />} label="Success" />
		</div>
	);
}

export function IconDemoSized() {
	return (
		<div className="flex items-center gap-4">
			<div className="flex items-center gap-1.5">
				<Icon render={<SearchIcon label="" size="small" />} label="Small" />
				<span className="text-xs text-text-subtlest">small (12px)</span>
			</div>
			<div className="flex items-center gap-1.5">
				<Icon render={<SearchIcon label="" />} label="Medium" />
				<span className="text-xs text-text-subtlest">medium (16px)</span>
			</div>
		</div>
	);
}

export function IconDemoColored() {
	return (
		<div className="flex items-center gap-3">
			<Icon render={<CheckCircleIcon label="" />} label="Success" className="text-text-success" />
			<Icon render={<SearchIcon label="" />} label="Info" className="text-text-information" />
			<Icon render={<AddIcon label="" />} label="Discovery" className="text-text-discovery" />
			<Icon render={<HomeIcon label="" />} label="Subtle" className="text-text-subtle" />
		</div>
	);
}
