"use client";

import { ConfluenceIcon, JiraIcon, LoomIcon, GoalsIcon, TeamsIcon } from "@/components/ui/logo";

interface LogoProps {
	label: string;
	color?: string;
}

export function ConfluenceLogo(props: Readonly<LogoProps>) {
	void props;
	return <ConfluenceIcon size="xsmall" />;
}

export function JiraLogo(props: Readonly<LogoProps>) {
	void props;
	return <JiraIcon size="xsmall" />;
}

export function LoomLogoWrapper(props: Readonly<LogoProps>) {
	void props;
	return <LoomIcon size="xsmall" />;
}

export function GoalsLogo(props: Readonly<LogoProps>) {
	void props;
	return <GoalsIcon size="xsmall" />;
}

export function TeamsLogo(props: Readonly<LogoProps>) {
	void props;
	return <TeamsIcon size="xsmall" />;
}
