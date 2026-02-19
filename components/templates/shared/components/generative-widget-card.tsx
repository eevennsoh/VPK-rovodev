"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import AngleBracketsIcon from "@atlaskit/icon/core/angle-brackets";
import AudioIcon from "@atlaskit/icon/core/audio";
import BoardIcon from "@atlaskit/icon/core/board";
import ChartBarIcon from "@atlaskit/icon/core/chart-bar";
import ChartBubbleIcon from "@atlaskit/icon/core/chart-bubble";
import ChartMatrixIcon from "@atlaskit/icon/core/chart-matrix";
import ChartPieIcon from "@atlaskit/icon/core/chart-pie";
import ChartTrendIcon from "@atlaskit/icon/core/chart-trend";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import CrossIcon from "@atlaskit/icon/core/cross";
import FileIcon from "@atlaskit/icon/core/file";
import ImageIcon from "@atlaskit/icon/core/image";
import PageIcon from "@atlaskit/icon/core/page";
import TableIcon from "@atlaskit/icon/core/table";
import TextIcon from "@atlaskit/icon/core/text";
import VideoIcon from "@atlaskit/icon/core/video";
import WorkItemIcon from "@atlaskit/icon/core/work-item";
import GenerativeIndicatorIcon from "@atlaskit/icon-lab/core/generative-indicator";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Tile } from "@/components/ui/tile";
import { AudioPlayerElement } from "@/components/ui-ai/audio-player";
import { JsonRenderView } from "@/lib/json-render/renderer";
import {
	parseGenerativeWidget,
	resolveGenerativeWidgetMetadata,
	type ParsedGenerativeWidget,
} from "@/components/templates/shared/lib/generative-widget";
import { formatContentTypeLabel } from "@/components/templates/shared/lib/generative-widget-branding";
import type { GenerativeContentType } from "@/components/templates/shared/lib/generative-widget";

interface GenerativeWidgetCardProps {
	widgetType: string;
	widgetData: unknown;
	className?: string;
}

interface GenerativeWidgetCardShellProps {
	widget: ParsedGenerativeWidget;
	className?: string;
	previewMode?: boolean;
	onOpenPreview?: () => void;
}

interface GenerativeWidgetHeaderData {
	contentTypeLabel: string;
	metadata: ReturnType<typeof resolveGenerativeWidgetMetadata>;
}

function resolveGenerativeWidgetHeaderData(
	widget: ParsedGenerativeWidget
): GenerativeWidgetHeaderData {
	const metadata = resolveGenerativeWidgetMetadata(widget);
	const contentTypeLabel = formatContentTypeLabel(metadata.contentType);

	return {
		contentTypeLabel,
		metadata,
	};
}

function renderContentTypeIcon(contentType: GenerativeContentType): ReactNode {
	if (contentType === "image") {
		return <ImageIcon label="" size="small" />;
	}

	if (contentType === "text") {
		return <TextIcon label="" size="small" />;
	}

	if (contentType === "chart-bar") {
		return <ChartBarIcon label="" size="small" />;
	}

	if (contentType === "chart-line" || contentType === "chart-area") {
		return <ChartTrendIcon label="" size="small" />;
	}

	if (contentType === "chart-pie") {
		return <ChartPieIcon label="" size="small" />;
	}

	if (contentType === "chart-radar") {
		return <ChartMatrixIcon label="" size="small" />;
	}

	if (contentType === "chart-scatter") {
		return <ChartBubbleIcon label="" size="small" />;
	}

	if (contentType === "chart") {
		return <ChartBarIcon label="" size="small" />;
	}

	if (contentType === "sound") {
		return <AudioIcon label="" size="small" />;
	}

	if (contentType === "video") {
		return <VideoIcon label="" size="small" />;
	}

	if (contentType === "work-item") {
		return <WorkItemIcon label="" size="small" />;
	}

	if (contentType === "page") {
		return <PageIcon label="" size="small" />;
	}

	if (contentType === "board") {
		return <BoardIcon label="" size="small" />;
	}

	if (contentType === "table") {
		return <TableIcon label="" size="small" />;
	}

	if (contentType === "code") {
		return <AngleBracketsIcon label="" size="small" />;
	}

	if (contentType === "ui") {
		return <FileIcon label="" size="small" />;
	}

	return <GenerativeIndicatorIcon label="" size="small" />;
}

function renderContentTypeTile(
	contentType: GenerativeContentType,
	contentTypeLabel: string,
	tileSize: "medium" | "large" = "medium"
): ReactNode {
	return (
		<Tile label={contentTypeLabel} size={tileSize} variant="transparent" hasBorder className="text-icon-subtle [&_span]:!size-4 [&_svg]:!size-4">
			{renderContentTypeIcon(contentType)}
		</Tile>
	);
}

function renderWidgetBody(
	widget: ParsedGenerativeWidget,
	previewMode: boolean,
	withContainer = true
): ReactNode {
	if (widget.type === "genui-preview") {
		const content = <JsonRenderView spec={widget.spec} />;
		if (!withContainer) {
			return previewMode ? (
				<div className="max-h-[65vh] overflow-auto">
					{content}
				</div>
			) : content;
		}

		return (
			<div
				className={cn(
					"overflow-hidden rounded-md bg-surface",
					previewMode && "max-h-[65vh] overflow-auto"
				)}
			>
				{content}
			</div>
		);
	}

	if (widget.type === "audio-preview") {
		const content = (
			<>
				<AudioPlayerElement controls preload="metadata" src={widget.audioUrl} />
				{widget.transcript ? (
					<p className={cn("text-xs text-text-subtle", withContainer ? "mt-2" : "mt-3")}>
						{widget.transcript}
					</p>
				) : null}
			</>
		);
		if (!withContainer) {
			return (
				<div>
					{content}
				</div>
			);
		}

		return (
			<div className="rounded-md bg-surface">
				{content}
			</div>
		);
	}

	if (widget.type === "image-preview") {
		return (
			<div className="grid place-items-center gap-2 sm:grid-cols-2">
				{widget.images.map((image, index) => (
					<a
						key={`${image.url}-${index}`}
						href={image.url}
						target="_blank"
						rel="noreferrer"
						className={cn(
							"block overflow-hidden aspect-square w-full",
							withContainer ? "rounded-md bg-surface" : ""
						)}
					>
						<Image
							src={image.url}
							alt={`Generated image ${index + 1}`}
							width={960}
							height={960}
							unoptimized
							className="size-full object-cover"
						/>
					</a>
				))}
			</div>
		);
	}

	return null;
}

function GenerativeWidgetCardShell({
	widget,
	className,
	previewMode = false,
	onOpenPreview,
}: Readonly<GenerativeWidgetCardShellProps>): ReactNode {
	const [expanded, setExpanded] = useState(true);
	const { metadata, contentTypeLabel } = resolveGenerativeWidgetHeaderData(widget);

	return (
		<Card className={cn("w-full gap-0 p-0", className)}>
			<CardHeader className={cn("px-4 py-3", expanded && "border-b")}>
				<div className="flex min-w-0 items-center gap-3">
					{renderContentTypeTile(metadata.contentType, contentTypeLabel)}
					<div className="min-w-0 flex-1">
						<CardTitle className="truncate text-sm leading-5 font-semibold">
							{metadata.title}
						</CardTitle>
						<CardDescription className="line-clamp-2 text-xs leading-4">
							{metadata.description}
						</CardDescription>
					</div>
				</div>
				<CardAction className="self-center">
					<Button
						variant="ghost"
						size="icon"
						className="text-text-subtle"
						aria-label={expanded ? "Collapse card details" : "Expand card details"}
						onClick={() => setExpanded((prev) => !prev)}
					>
						<span
							className="transition-transform duration-200 ease-in-out"
							style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
						>
							<ChevronDownIcon label="" size="small" />
						</span>
					</Button>
				</CardAction>
			</CardHeader>
			<div
				className="grid transition-[grid-template-rows] duration-200 ease-in-out"
				style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
			>
				<div className="overflow-hidden">
					<CardContent className={cn("px-4", previewMode ? "py-4" : "py-3")}>
						{renderWidgetBody(widget, previewMode)}
					</CardContent>
					<CardFooter className="h-16 justify-end px-4 py-4">
						{previewMode ? (
							<Button variant="outline" className="h-8 min-w-[117px]" disabled>
								Open preview
							</Button>
						) : (
							<Button
								variant="outline"
								className="h-8 min-w-[117px]"
								onClick={onOpenPreview}
							>
								Open preview
							</Button>
						)}
					</CardFooter>
				</div>
			</div>
		</Card>
	);
}

export function GenerativeWidgetCard({
	widgetType,
	widgetData,
	className,
}: Readonly<GenerativeWidgetCardProps>): ReactNode {
	const [previewOpen, setPreviewOpen] = useState(false);
	const parsedWidget = parseGenerativeWidget(widgetType, widgetData);
	if (!parsedWidget) {
		return null;
	}

	const { metadata, contentTypeLabel } = resolveGenerativeWidgetHeaderData(parsedWidget);

	return (
		<div className={cn("pb-2", className)}>
			<Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
				<GenerativeWidgetCardShell
					widget={parsedWidget}
					onOpenPreview={() => setPreviewOpen(true)}
				/>
				<DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-5xl" size="xl" showCloseButton={false}>
					<DialogHeader className="flex-row items-center border-b p-6">
						<div className="flex min-w-0 flex-1 items-center gap-3">
							{renderContentTypeTile(metadata.contentType, contentTypeLabel)}
							<div className="min-w-0 flex-1 space-y-1">
								<DialogTitle className="truncate">
									{metadata.title}
								</DialogTitle>
								<DialogDescription className="line-clamp-2">
									{metadata.description}
								</DialogDescription>
							</div>
						</div>
						<DialogClose render={<Button variant="ghost" size="icon-sm" />}>
							<CrossIcon label="Close" />
						</DialogClose>
					</DialogHeader>
					<div className="p-6">
						{renderWidgetBody(parsedWidget, true, false)}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
