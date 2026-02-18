"use client";

import AutomationIcon from "@atlaskit/icon/core/automation";
import DataFlowIcon from "@atlaskit/icon/core/data-flow";
import GlobeIcon from "@atlaskit/icon/core/globe";
import LightbulbIcon from "@atlaskit/icon/core/lightbulb";
import SearchIcon from "@atlaskit/icon/core/search";
import StarIcon from "@atlaskit/icon/core/star-starred";

import { SkillTag, SkillTagGroup } from "@/components/ui/skill-tag";

export default function SkillTagDemo() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<SkillTag icon={<SearchIcon label="" size="small" />} color="blue">
				Search
			</SkillTag>
			<SkillTag icon={<AutomationIcon label="" size="small" />} color="green">
				Automation
			</SkillTag>
			<SkillTag icon={<LightbulbIcon label="" size="small" />} color="purple">
				Insights
			</SkillTag>
			<SkillTag icon={<DataFlowIcon label="" size="small" />} color="teal">
				Data Flow
			</SkillTag>
		</div>
	);
}

export function SkillTagDemoDefault() {
	return <SkillTag>Default skill</SkillTag>;
}

export function SkillTagDemoColors() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<SkillTag color="blue">Blue</SkillTag>
			<SkillTag color="green">Green</SkillTag>
			<SkillTag color="red">Red</SkillTag>
			<SkillTag color="yellow">Yellow</SkillTag>
			<SkillTag color="purple">Purple</SkillTag>
			<SkillTag color="teal">Teal</SkillTag>
		</div>
	);
}

export function SkillTagDemoWithIcon() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<SkillTag icon={<SearchIcon label="" size="small" />} color="blue">
				Search
			</SkillTag>
			<SkillTag icon={<AutomationIcon label="" size="small" />} color="green">
				Automation
			</SkillTag>
			<SkillTag icon={<LightbulbIcon label="" size="small" />} color="purple">
				Insights
			</SkillTag>
			<SkillTag icon={<GlobeIcon label="" size="small" />} color="teal">
				Web Browse
			</SkillTag>
			<SkillTag icon={<StarIcon label="" size="small" />} color="yellow">
				Favorites
			</SkillTag>
		</div>
	);
}

export function SkillTagDemoInteractive() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<SkillTag icon={<SearchIcon label="" size="small" />} color="blue" onClick={() => alert("Search clicked")}>
				Search
			</SkillTag>
			<SkillTag icon={<AutomationIcon label="" size="small" />} color="green" onClick={() => alert("Automation clicked")}>
				Automation
			</SkillTag>
			<SkillTag color="red" onClick={() => alert("Alert clicked")}>
				Alert
			</SkillTag>
		</div>
	);
}

export function SkillTagDemoGroup() {
	return (
		<SkillTagGroup>
			<SkillTag icon={<SearchIcon label="" size="small" />} color="blue">
				Search
			</SkillTag>
			<SkillTag icon={<AutomationIcon label="" size="small" />} color="green">
				Automation
			</SkillTag>
			<SkillTag icon={<LightbulbIcon label="" size="small" />} color="purple">
				Insights
			</SkillTag>
			<SkillTag icon={<DataFlowIcon label="" size="small" />} color="teal">
				Data Flow
			</SkillTag>
		</SkillTagGroup>
	);
}

export function SkillTagDemoInline() {
	return (
		<p className="text-sm text-text">
			The agent used{" "}
			<SkillTag icon={<SearchIcon label="" size="small" />} color="blue">
				Search
			</SkillTag>{" "}
			and{" "}
			<SkillTag icon={<AutomationIcon label="" size="small" />} color="green">
				Automation
			</SkillTag>{" "}
			to complete the task.
		</p>
	);
}
