"use client";

import AddIcon from "@atlaskit/icon/core/add";
import EditIcon from "@atlaskit/icon/core/edit";
import SearchIcon from "@atlaskit/icon/core/search";
import SettingsIcon from "@atlaskit/icon/core/settings";
import StarIcon from "@atlaskit/icon/core/star-starred";
import HomeIcon from "@atlaskit/icon/core/home";
import LightbulbIcon from "@atlaskit/icon/core/lightbulb";
import HeartIcon from "@atlaskit/icon/core/heart";
import LockIcon from "@atlaskit/icon/core/lock-locked";
import FlagIcon from "@atlaskit/icon/core/flag";
import { IconTile } from "@/components/ui/icon-tile";

export default function IconTileDemo() {
	return (
		<div className="flex items-center gap-3">
			<IconTile icon={<SearchIcon label="" />} label="Search" variant="blue" />
			<IconTile icon={<AddIcon label="" />} label="Add" variant="green" />
			<IconTile icon={<EditIcon label="" />} label="Edit" variant="purple" />
			<IconTile icon={<SettingsIcon label="" />} label="Settings" variant="gray" />
		</div>
	);
}

export function IconTileDemoDefault() {
	return <IconTile icon={<SearchIcon label="" />} label="Search" variant="blue" />;
}

export function IconTileDemoSizes() {
	return (
		<div className="flex items-end gap-3">
			<IconTile icon={<SearchIcon label="" />} label="Search" variant="blue" size="xsmall" />
			<IconTile icon={<SearchIcon label="" />} label="Search" variant="blue" size="small" />
			<IconTile icon={<SearchIcon label="" />} label="Search" variant="blue" size="medium" />
			<IconTile icon={<SearchIcon label="" />} label="Search" variant="blue" size="large" />
			<IconTile icon={<SearchIcon label="" />} label="Search" variant="blue" size="xlarge" />
		</div>
	);
}

export function IconTileDemoAppearances() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<IconTile icon={<SearchIcon label="" />} label="Gray" variant="gray" />
			<IconTile icon={<StarIcon label="" />} label="Blue" variant="blue" />
			<IconTile icon={<HomeIcon label="" />} label="Teal" variant="teal" />
			<IconTile icon={<AddIcon label="" />} label="Green" variant="green" />
			<IconTile icon={<LightbulbIcon label="" />} label="Lime" variant="lime" />
			<IconTile icon={<HeartIcon label="" />} label="Yellow" variant="yellow" />
			<IconTile icon={<FlagIcon label="" />} label="Orange" variant="orange" />
			<IconTile icon={<LockIcon label="" />} label="Red" variant="red" />
			<IconTile icon={<EditIcon label="" />} label="Magenta" variant="magenta" />
			<IconTile icon={<SettingsIcon label="" />} label="Purple" variant="purple" />
		</div>
	);
}

export function IconTileDemoAppearancesBold() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<IconTile icon={<SearchIcon label="" />} label="Gray" variant="grayBold" />
			<IconTile icon={<StarIcon label="" />} label="Blue" variant="blueBold" />
			<IconTile icon={<HomeIcon label="" />} label="Teal" variant="tealBold" />
			<IconTile icon={<AddIcon label="" />} label="Green" variant="greenBold" />
			<IconTile icon={<LightbulbIcon label="" />} label="Lime" variant="limeBold" />
			<IconTile icon={<HeartIcon label="" />} label="Yellow" variant="yellowBold" />
			<IconTile icon={<FlagIcon label="" />} label="Orange" variant="orangeBold" />
			<IconTile icon={<LockIcon label="" />} label="Red" variant="redBold" />
			<IconTile icon={<EditIcon label="" />} label="Magenta" variant="magentaBold" />
			<IconTile icon={<SettingsIcon label="" />} label="Purple" variant="purpleBold" />
		</div>
	);
}

export function IconTileDemoShapes() {
	return (
		<div className="flex items-center gap-3">
			<IconTile icon={<SearchIcon label="" />} label="Square" variant="blue" shape="square" />
			<IconTile icon={<SearchIcon label="" />} label="Circle" variant="blue" shape="circle" />
		</div>
	);
}
