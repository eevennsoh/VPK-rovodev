"use client";

import CheckCircleIcon from "@atlaskit/icon/core/check-circle";
import ArrowDownRightIcon from "@atlaskit/icon/core/arrow-down-right";
import { Lozenge, LozengeDropdownTrigger } from "@/components/ui/lozenge";

export default function LozengeDemo() {
	return (
		<div className="flex items-center gap-2">
			<Lozenge>Neutral</Lozenge>
			<Lozenge variant="success">Success</Lozenge>
			<Lozenge variant="information">Information</Lozenge>
			<Lozenge variant="discovery">Discovery</Lozenge>
		</div>
	);
}

export function LozengeDemoDefault() {
	return <Lozenge>Neutral</Lozenge>;
}

export function LozengeDemoAppearances() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Lozenge variant="neutral">Neutral</Lozenge>
			<Lozenge variant="success">Success</Lozenge>
			<Lozenge variant="danger">Danger</Lozenge>
			<Lozenge variant="information">Information</Lozenge>
			<Lozenge variant="discovery">Discovery</Lozenge>
			<Lozenge variant="warning">Warning</Lozenge>
		</div>
	);
}

export function LozengeDemoBold() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Lozenge isBold>Neutral</Lozenge>
			<Lozenge variant="success" isBold>Success</Lozenge>
			<Lozenge variant="danger" isBold>Danger</Lozenge>
			<Lozenge variant="information" isBold>Information</Lozenge>
			<Lozenge variant="discovery" isBold>Discovery</Lozenge>
			<Lozenge variant="warning" isBold>Warning</Lozenge>
		</div>
	);
}

export function LozengeDemoAccentColors() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Lozenge variant="accent-red">Red</Lozenge>
			<Lozenge variant="accent-orange">Orange</Lozenge>
			<Lozenge variant="accent-yellow">Yellow</Lozenge>
			<Lozenge variant="accent-lime">Lime</Lozenge>
			<Lozenge variant="accent-green">Green</Lozenge>
			<Lozenge variant="accent-teal">Teal</Lozenge>
			<Lozenge variant="accent-blue">Blue</Lozenge>
			<Lozenge variant="accent-purple">Purple</Lozenge>
			<Lozenge variant="accent-magenta">Magenta</Lozenge>
			<Lozenge variant="accent-gray">Gray</Lozenge>
		</div>
	);
}

export function LozengeDemoSpacing() {
	return (
		<div className="flex flex-wrap items-center gap-4">
			<div className="flex items-center gap-2">
				<Lozenge variant="information">Compact</Lozenge>
				<span className="text-xs text-text-subtlest">compact (default)</span>
			</div>
			<div className="flex items-center gap-2">
				<Lozenge variant="information" size="spacious">Spacious</Lozenge>
				<span className="text-xs text-text-subtlest">spacious</span>
			</div>
		</div>
	);
}

export function LozengeDemoWithIcon() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Lozenge variant="success" icon={<CheckCircleIcon label="" size="small" />}>
				Approved
			</Lozenge>
			<Lozenge variant="success" size="spacious" icon={<CheckCircleIcon label="" />}>
				Approved
			</Lozenge>
		</div>
	);
}

export function LozengeDemoTrailingMetric() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Lozenge variant="success" metric="0.8">
				Completed
			</Lozenge>
			<Lozenge variant="danger" size="spacious" metric="0.3" icon={<ArrowDownRightIcon label="" size="small" />}>
				Off track
			</Lozenge>
		</div>
	);
}

export function LozengeDemoMaxWidth() {
	return (
		<Lozenge maxWidth={100} variant="information">
			This is a very long lozenge label that will truncate
		</Lozenge>
	);
}

export function LozengeDemoDropdownTrigger() {
	return <LozengeDropdownTrigger variant="information">In progress</LozengeDropdownTrigger>;
}

export function LozengeDemoDropdownTriggerAppearances() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<LozengeDropdownTrigger variant="neutral">Neutral</LozengeDropdownTrigger>
			<LozengeDropdownTrigger variant="success">Success</LozengeDropdownTrigger>
			<LozengeDropdownTrigger variant="danger">Danger</LozengeDropdownTrigger>
			<LozengeDropdownTrigger variant="information">Information</LozengeDropdownTrigger>
			<LozengeDropdownTrigger variant="discovery">Discovery</LozengeDropdownTrigger>
			<LozengeDropdownTrigger variant="warning">Warning</LozengeDropdownTrigger>
		</div>
	);
}

export function LozengeDemoUsage() {
	return (
		<div className="flex items-center gap-3">
			<span className="text-sm text-text">PROJ-123</span>
			<Lozenge variant="information">In progress</Lozenge>
		</div>
	);
}
