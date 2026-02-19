"use client";

import { token } from "@/lib/tokens";
import Heading from "@/components/blocks/shared-ui/heading";
import { IconTile } from "@/components/ui/icon-tile";
import Image from "next/image";
import { defaultSuggestions, type RovoSuggestion } from "@/lib/rovo-suggestions";

interface ChatGreetingProps {
	/**
	 * Optional custom heading text
	 */
	heading?: string;
	/**
	 * Callback when a suggestion is clicked
	 */
	onSuggestionClick?: (suggestion: RovoSuggestion) => void;
}

// Styles for the list item row
const listItemStyles = {
	display: "flex",
	alignItems: "center",
	gap: token("space.150"),
	padding: token("space.075"),
	borderRadius: token("radius.large"),
	width: "100%",
	cursor: "pointer",
	transition: "background-color 0.1s ease",
} as const;

function SkillListItem({
	suggestion,
	onClick,
}: Readonly<{
	suggestion: RovoSuggestion;
	onClick?: () => void;
}>) {
	const IconComponent = suggestion.icon;
	const isAtlassianAppSuggestion = suggestion.id === "create-jira-ticket" || suggestion.id === "summarize-confluence";
	const iconColor = isAtlassianAppSuggestion ? token("color.icon.brand") : token("color.icon.subtlest");

	return (
		<div
			role="button"
			tabIndex={0}
			onClick={onClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onClick?.();
				}
			}}
			style={listItemStyles}
			onMouseEnter={(e) => {
				e.currentTarget.style.backgroundColor = token("color.background.neutral.subtle.hovered");
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.backgroundColor = "transparent";
			}}
		>
			<IconTile
				size="medium"
				label={suggestion.label}
				className="border border-border bg-surface"
				icon={
					suggestion.imageSrc ? (
						<Image src={suggestion.imageSrc} alt={suggestion.label} width={16} height={16} className="size-4" style={{ objectFit: "contain" }} />
					) : IconComponent ? (
						<IconComponent label={suggestion.label} color={iconColor} />
					) : null
				}
			/>

			{/* Label text */}
			<span className="text-sm text-text-subtle">{suggestion.label}</span>
		</div>
	);
}

export default function ChatGreeting({ heading = "Let's do this together", onSuggestionClick }: Readonly<ChatGreetingProps>) {
	return (
		<div style={{ width: "100%" }}>
			<div className="flex flex-col gap-6">
				{/* Greeting section - centered */}
				<div className="flex flex-col items-center gap-2">
					<Image src="/illustration-ai/chat/light.svg" alt="Chat" width={80} height={80} loading="eager" style={{ objectFit: "contain", width: "auto", height: "auto" }} />
					<Heading size="large">{heading}</Heading>
				</div>

				{/* Skills list - full width */}
				<div style={{ width: "100%" }}>
					<div className="flex flex-col gap-1">
						{defaultSuggestions.map((suggestion) => (
							<SkillListItem key={suggestion.id} suggestion={suggestion} onClick={() => onSuggestionClick?.(suggestion)} />
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
