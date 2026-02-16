"use client";

import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import CheckCircleIcon from "@atlaskit/icon/core/check-circle";

export default function BadgeDemo() {
	return (
		<div className="flex items-center gap-2">
			<Badge>8</Badge>
			<Badge variant="info">12</Badge>
			<Badge variant="success">+100</Badge>
			<Badge variant="destructive">-50</Badge>
		</div>
	);
}

export function BadgeDemoDefault() {
	return <Badge>8</Badge>;
}

export function BadgeDemoSecondary() {
	return <Badge variant="secondary">8</Badge>;
}

export function BadgeDemoDestructive() {
	return <Badge variant="destructive">-50</Badge>;
}

export function BadgeDemoSuccess() {
	return <Badge variant="success">+100</Badge>;
}

export function BadgeDemoWarning() {
	return <Badge variant="warning">5</Badge>;
}

export function BadgeDemoInfo() {
	return <Badge variant="info">12</Badge>;
}

export function BadgeDemoDiscovery() {
	return <Badge variant="discovery">3</Badge>;
}

export function BadgeDemoOutline() {
	return <Badge variant="outline">8</Badge>;
}

export function BadgeDemoGhost() {
	return <Badge variant="ghost">8</Badge>;
}

export function BadgeDemoLink() {
	return <Badge variant="link">8</Badge>;
}

export function BadgeDemoAdsAppearances() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Badge variant="neutral">8</Badge>
			<Badge variant="information">12</Badge>
			<Badge variant="inverse">12</Badge>
			<Badge variant="success">+100</Badge>
			<Badge variant="danger">-50</Badge>
			<Badge variant="warning">5</Badge>
			<Badge variant="discovery">3</Badge>
		</div>
	);
}

export function BadgeDemoAdsLegacyAliases() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Badge variant="default">8</Badge>
			<Badge variant="primary">12</Badge>
			<Badge variant="primaryInverted">12</Badge>
			<Badge variant="added">+100</Badge>
			<Badge variant="removed">-50</Badge>
		</div>
	);
}

export function BadgeDemoVariants() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Badge>8</Badge>
			<Badge variant="secondary">8</Badge>
			<Badge variant="destructive">-50</Badge>
			<Badge variant="success">+100</Badge>
			<Badge variant="warning">5</Badge>
			<Badge variant="info">12</Badge>
			<Badge variant="discovery">3</Badge>
			<Badge variant="inverse">12</Badge>
			<Badge variant="outline">8</Badge>
			<Badge variant="ghost">8</Badge>
			<Badge variant="link">8</Badge>
		</div>
	);
}

export function BadgeDemoWithIcon() {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<Badge variant="success">
				<CheckCircleIcon label="" color="currentColor" />
				+100
			</Badge>
			<Badge variant="info">
				<CheckCircleIcon label="" color="currentColor" />
				12
			</Badge>
		</div>
	);
}

export function BadgeDemoMaxValue() {
	return (
		<div className="flex items-center gap-2">
			<Badge max={99}>{150}</Badge>
			<Badge max={500}>{1000}</Badge>
			<Badge max={99}>{50}</Badge>
		</div>
	);
}

export function BadgeDemoWithSpinner() {
	return (
		<div className="flex items-center gap-4">
			<Badge>
				<Spinner data-icon="inline-start" />
				8
			</Badge>
			<Badge variant="info">
				<Spinner data-icon="inline-start" />
				12
			</Badge>
			<Badge variant="success">
				<Spinner data-icon="inline-start" />
				+100
			</Badge>
		</div>
	);
}

export function BadgeDemoDisabled() {
	return (
		<div className="flex items-center gap-4">
			<Badge className="pointer-events-none bg-bg-disabled text-text-disabled">8</Badge>
			<Badge variant="secondary" className="pointer-events-none bg-bg-disabled text-text-disabled">8</Badge>
			<Badge variant="outline" className="pointer-events-none opacity-(--opacity-disabled)">8</Badge>
		</div>
	);
}
