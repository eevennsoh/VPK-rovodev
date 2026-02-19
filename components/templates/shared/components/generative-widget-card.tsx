"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import AppsIcon from "@atlaskit/icon/core/apps";
import AudioIcon from "@atlaskit/icon/core/audio";
import DashboardIcon from "@atlaskit/icon/core/dashboard";
import FileIcon from "@atlaskit/icon/core/file";
import ImageIcon from "@atlaskit/icon/core/image";
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
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { AudioPlayerElement } from "@/components/ui-ai/audio-player";
import { JsonRenderView } from "@/lib/json-render/renderer";
import {
	parseGenerativeWidget,
	resolveGenerativeWidgetMetadata,
	type ParsedGenerativeWidget,
} from "@/components/templates/shared/lib/generative-widget";
import {
	formatContentTypeLabel,
	resolveGenerativeWidgetLogoSrc,
} from "@/components/templates/shared/lib/generative-widget-branding";
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

function renderContentTypeIcon(contentType: GenerativeContentType, label: string): ReactNode {
	if (contentType === "image") {
		return <ImageIcon label={label} size="small" />;
	}

	if (contentType === "sound") {
		return <AudioIcon label={label} size="small" />;
	}

	if (contentType === "chart") {
		return <DashboardIcon label={label} size="small" />;
	}

	if (contentType === "ui") {
		return <AppsIcon label={label} size="small" />;
	}

	return <FileIcon label={label} size="small" />;
}

function renderWidgetBody(widget: ParsedGenerativeWidget, previewMode: boolean): ReactNode {
	if (widget.type === "genui-preview") {
		return (
			<div
				className={cn(
					"overflow-hidden rounded-md border border-border bg-surface",
					previewMode ? "max-h-[65vh] overflow-auto p-4" : "p-3"
				)}
			>
				<JsonRenderView spec={widget.spec} />
			</div>
		);
	}

	if (widget.type === "audio-preview") {
		return (
			<div className="rounded-md border border-border bg-surface p-3">
				<AudioPlayerElement controls preload="metadata" src={widget.audioUrl} />
				{widget.transcript ? (
					<p className="mt-2 text-xs text-text-subtle">
						{widget.transcript}
					</p>
				) : null}
			</div>
		);
	}

	if (widget.type === "image-preview") {
		return (
			<div className="grid gap-2 sm:grid-cols-2">
				{widget.images.map((image, index) => (
					<a
						key={`${image.url}-${index}`}
						href={image.url}
						target="_blank"
						rel="noreferrer"
						className="block overflow-hidden rounded-md border border-border bg-surface"
					>
						<Image
							src={image.url}
							alt={`Generated image ${index + 1}`}
							width={960}
							height={960}
							unoptimized
							className="h-auto w-full object-cover"
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
	const metadata = resolveGenerativeWidgetMetadata(widget);
	const sourceLogoSrc = resolveGenerativeWidgetLogoSrc({
		sourceLogoSrc: metadata.sourceLogoSrc,
		sourceName: metadata.sourceName,
	});
	const sourceLabel = metadata.sourceName ?? "VPK";
	const contentTypeLabel = formatContentTypeLabel(metadata.contentType);

	return (
		<Card className={cn("w-full gap-0 p-0", className)}>
			<CardHeader className="border-b px-4 py-3">
				<div className="flex min-w-0 items-center gap-3">
					<Image
						src={sourceLogoSrc}
						alt={`${sourceLabel} logo`}
						width={32}
						height={32}
						unoptimized
						className="rounded-md border border-border bg-surface object-contain"
					/>
					<div className="min-w-0 flex-1">
						<CardTitle className="truncate text-sm leading-5 font-semibold">
							{metadata.title}
						</CardTitle>
						<CardDescription className="line-clamp-2 text-xs leading-4">
							{metadata.description}
						</CardDescription>
					</div>
				</div>
				<CardAction className="self-center text-icon-subtle">
					{renderContentTypeIcon(
						metadata.contentType,
						`${contentTypeLabel} content`
					)}
				</CardAction>
			</CardHeader>
			<CardContent className={cn("px-4", previewMode ? "py-4" : "py-3")}>
				{renderWidgetBody(widget, previewMode)}
			</CardContent>
			<CardFooter className="h-16 justify-end !bg-card px-4 py-4">
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

	const metadata = resolveGenerativeWidgetMetadata(parsedWidget);

	return (
		<div className={cn("pb-2", className)}>
			<Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
				<GenerativeWidgetCardShell
					widget={parsedWidget}
					onOpenPreview={() => setPreviewOpen(true)}
				/>
				<DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-5xl" size="xl">
					<DialogHeader className="sr-only">
						<DialogTitle>{metadata.title}</DialogTitle>
						<DialogDescription>{metadata.description}</DialogDescription>
					</DialogHeader>
					<div className="p-4">
						<GenerativeWidgetCardShell
							widget={parsedWidget}
							previewMode
						/>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
