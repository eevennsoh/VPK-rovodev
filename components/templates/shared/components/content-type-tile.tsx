import type { ReactNode } from "react";
import AngleBracketsIcon from "@atlaskit/icon/core/angle-brackets";
import AudioIcon from "@atlaskit/icon/core/audio";
import BoardIcon from "@atlaskit/icon/core/board";
import ChartBarIcon from "@atlaskit/icon/core/chart-bar";
import ChartBubbleIcon from "@atlaskit/icon/core/chart-bubble";
import ChartMatrixIcon from "@atlaskit/icon/core/chart-matrix";
import ChartPieIcon from "@atlaskit/icon/core/chart-pie";
import ChartTrendIcon from "@atlaskit/icon/core/chart-trend";
import FileIcon from "@atlaskit/icon/core/file";
import ImageIcon from "@atlaskit/icon/core/image";
import PageIcon from "@atlaskit/icon/core/page";
import TableIcon from "@atlaskit/icon/core/table";
import TextIcon from "@atlaskit/icon/core/text";
import VideoIcon from "@atlaskit/icon/core/video";
import WorkItemIcon from "@atlaskit/icon/core/work-item";
import GenerativeIndicatorIcon from "@atlaskit/icon-lab/core/generative-indicator";
import { Tile } from "@/components/ui/tile";
import type { GenerativeContentType } from "@/components/templates/shared/lib/generative-widget";

export function renderContentTypeIcon(contentType: GenerativeContentType): ReactNode {
	switch (contentType) {
		case "image": return <ImageIcon label="" size="small" />;
		case "text": return <TextIcon label="" size="small" />;
		case "chart-bar": return <ChartBarIcon label="" size="small" />;
		case "chart-line":
		case "chart-area": return <ChartTrendIcon label="" size="small" />;
		case "chart-pie": return <ChartPieIcon label="" size="small" />;
		case "chart-radar": return <ChartMatrixIcon label="" size="small" />;
		case "chart-scatter": return <ChartBubbleIcon label="" size="small" />;
		case "chart": return <ChartBarIcon label="" size="small" />;
		case "sound": return <AudioIcon label="" size="small" />;
		case "video": return <VideoIcon label="" size="small" />;
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
}: Readonly<{
	contentType: GenerativeContentType;
	label: string;
	size?: "medium" | "large";
}>): ReactNode {
	return (
		<Tile label={label} size={size} variant="transparent" hasBorder className="text-icon-subtle [&_span]:!size-4 [&_svg]:!size-4">
			{renderContentTypeIcon(contentType)}
		</Tile>
	);
}
