import type { ReactNode } from "react";
import Image from "next/image";
import AngleBracketsIcon from "@atlaskit/icon/core/angle-brackets";
import AudioIcon from "@atlaskit/icon/core/audio";
import BoardIcon from "@atlaskit/icon/core/board";
import CalendarIcon from "@atlaskit/icon/core/calendar";
import ChartBarIcon from "@atlaskit/icon/core/chart-bar";
import ChartBubbleIcon from "@atlaskit/icon/core/chart-bubble";
import ChartMatrixIcon from "@atlaskit/icon/core/chart-matrix";
import ChartPieIcon from "@atlaskit/icon/core/chart-pie";
import ChartTrendIcon from "@atlaskit/icon/core/chart-trend";
import CommentIcon from "@atlaskit/icon/core/comment";
import FileIcon from "@atlaskit/icon/core/file";
import ImageIcon from "@atlaskit/icon/core/image";
import PageIcon from "@atlaskit/icon/core/page";
import TableIcon from "@atlaskit/icon/core/table";
import TextIcon from "@atlaskit/icon/core/text";
import TranslateIcon from "@atlaskit/icon/core/translate";
import VideoIcon from "@atlaskit/icon/core/video";
import WorkItemIcon from "@atlaskit/icon/core/work-item";
import GenerativeIndicatorIcon from "@atlaskit/icon-lab/core/generative-indicator";
import { Tile } from "@/components/ui/tile";
import { token } from "@/lib/tokens";
import { defaultSuggestions, type RovoSuggestion } from "@/lib/rovo-suggestions";
import type { GenerativeContentType } from "@/components/projects/shared/lib/generative-widget";

const SUGGESTION_BY_ID: ReadonlyMap<string, RovoSuggestion> = new Map(
	defaultSuggestions.map((suggestion) => [suggestion.id, suggestion])
);

const BLUE_ICON_SUGGESTION_IDS = new Set(["work-last-7-days", "draft-confluence-page"]);

function getSuggestionById(id: string): RovoSuggestion | null {
	return SUGGESTION_BY_ID.get(id) ?? null;
}

function resolveSuggestionIconColor(suggestionId: string): string {
	return BLUE_ICON_SUGGESTION_IDS.has(suggestionId)
		? token("color.icon.accent.blue")
		: token("color.icon.subtlest");
}

function resolveGreetingSuggestion({
	contentType,
	title,
	description,
	sourceName,
	hintText,
}: Readonly<{
	contentType: GenerativeContentType;
	title?: string;
	description?: string;
	sourceName?: string;
	hintText?: string;
}>): RovoSuggestion | null {
	const searchText = [title, description, sourceName, hintText]
		.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
		.join(" ")
		.toLowerCase();

	if (/\bfigma\b/.test(searchText)) {
		return getSuggestionById("figma-design-context");
	}

	if (/\bslack\b/.test(searchText)) {
		return getSuggestionById("send-slack-message");
	}

	if (/\bgoogle\s+calendar\b|\bcalendar\s+events?\b/.test(searchText)) {
		return getSuggestionById("list-google-calendar-events");
	}

	if (contentType === "translation" || /\btranslate|translation\b/.test(searchText)) {
		return getSuggestionById("translate-text");
	}

	if (
		contentType === "work-item" &&
		/\bwork\s*summary\b|\blast\s*7\s*days?\b|\brecent\s+work\b/.test(searchText)
	) {
		return getSuggestionById("work-last-7-days");
	}

	if (
		contentType === "page" &&
		/\bconfluence\b|\bdraft\b/.test(searchText)
	) {
		return getSuggestionById("draft-confluence-page");
	}

	return null;
}

function renderGreetingSuggestionIcon(suggestion: RovoSuggestion): ReactNode {
	if (suggestion.imageSrc) {
		return (
			<Image
				src={suggestion.imageSrc}
				alt={suggestion.label}
				width={16}
				height={16}
				className="size-4 object-contain"
			/>
		);
	}

	const IconComponent = suggestion.icon;
	if (!IconComponent) {
		return null;
	}

	return (
		<IconComponent
			label={suggestion.label}
			color={resolveSuggestionIconColor(suggestion.id)}
			size="small"
		/>
	);
}

function renderContentTypeIcon(contentType: GenerativeContentType): ReactNode {
	switch (contentType) {
		case "image": return <ImageIcon label="" size="small" />;
		case "text": return <TextIcon label="" size="small" />;
		case "translation": return <TranslateIcon label="" size="small" />;
		case "message": return <CommentIcon label="" size="small" />;
		case "chart-bar": return <ChartBarIcon label="" size="small" />;
		case "chart-line":
		case "chart-area": return <ChartTrendIcon label="" size="small" />;
		case "chart-pie": return <ChartPieIcon label="" size="small" />;
		case "chart-radar": return <ChartMatrixIcon label="" size="small" />;
		case "chart-scatter": return <ChartBubbleIcon label="" size="small" />;
		case "chart": return <ChartBarIcon label="" size="small" />;
		case "sound": return <AudioIcon label="" size="small" />;
		case "video": return <VideoIcon label="" size="small" />;
		case "calendar": return <CalendarIcon label="" size="small" />;
		case "work-item": return <WorkItemIcon label="" size="small" />;
		case "page": return <PageIcon label="" size="small" />;
		case "board": return <BoardIcon label="" size="small" />;
		case "table": return <TableIcon label="" size="small" />;
		case "code": return <AngleBracketsIcon label="" size="small" />;
		case "ui": return <FileIcon label="" size="small" />;
		default: return <GenerativeIndicatorIcon label="" size="small" />;
	}
}

export function ContentTypeTile({
	contentType,
	label,
	size = "medium",
	title,
	description,
	sourceName,
	sourceLogoSrc,
	hintText,
}: Readonly<{
	contentType: GenerativeContentType;
	label: string;
	size?: "medium" | "large";
	title?: string;
	description?: string;
	sourceName?: string;
	sourceLogoSrc?: string;
	hintText?: string;
}>): ReactNode {
	const normalizedSourceLogoSrc =
		typeof sourceLogoSrc === "string" && sourceLogoSrc.trim().length > 0
			? sourceLogoSrc.trim()
			: null;
	const matchedGreetingSuggestion = resolveGreetingSuggestion({
		contentType,
		title,
		description,
		sourceName,
		hintText,
	});

	const icon = normalizedSourceLogoSrc
		? (
			<Image
				src={normalizedSourceLogoSrc}
				alt={sourceName || label}
				width={16}
				height={16}
				className="size-4 object-contain"
			/>
		)
		: matchedGreetingSuggestion
			? renderGreetingSuggestionIcon(matchedGreetingSuggestion) ?? renderContentTypeIcon(contentType)
			: renderContentTypeIcon(contentType);

	return (
		<Tile label={label} size={size} variant="transparent" hasBorder className="text-icon-subtle [&_img]:!size-4 [&_span]:!size-4 [&_svg]:!size-4">
			{icon}
		</Tile>
	);
}
