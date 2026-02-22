"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import type { Spec } from "@json-render/react";
import CrossIcon from "@atlaskit/icon/core/cross";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	GenerativeCard,
	GenerativeCardBody,
	GenerativeCardContent,
	GenerativeCardFooter,
	GenerativeCardHeader,
} from "@/components/ui-ai/generative-card";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { AudioPlayerElement } from "@/components/ui-ai/audio-player";
import { JsonRenderView } from "@/lib/json-render/renderer";
import { useProgressiveSpec } from "@/lib/json-render/use-progressive-spec";
import {
	type GenerativeWidgetPrimaryActionPayload,
	parseGenerativeWidget,
	resolveGenerativeWidgetMetadata,
	createBodyOnlySpec,
	type ParsedGenerativeWidget,
	type GenerativeWidgetMetadata,
} from "@/components/templates/shared/lib/generative-widget";
import { formatContentTypeLabel } from "@/components/templates/shared/lib/generative-widget-branding";
import { ContentTypeTile } from "./content-type-tile";

/* -------------------------------------------------------------------------- */
/*  Props                                                                     */
/* -------------------------------------------------------------------------- */

interface GenerativeWidgetCardProps {
	widgetType: string;
	widgetData: unknown;
	className?: string;
	onPrimaryAction?: (
		payload: GenerativeWidgetPrimaryActionPayload
	) => Promise<void> | void;
}

interface GenerativeWidgetCardShellProps {
	bodyWidget: ParsedGenerativeWidget;
	metadata: GenerativeWidgetMetadata;
	className?: string;
	previewMode?: boolean;
	onOpenPreview?: () => void;
	onPrimaryAction?: () => Promise<void> | void;
	showPrimaryAction?: boolean;
	primaryActionLabel?: string;
	onStateChange?: (path: string, value: unknown) => void;
}

interface GenuiBodyProps {
	spec: Spec;
	previewMode: boolean;
	withContainer?: boolean;
	onStateChange?: (path: string, value: unknown) => void;
	progressive?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function isObjectRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Immutable path update -- shallow-copies only the objects along the mutation
 * path instead of deep-cloning the entire state tree on every change.
 */
function immutableSetByPath(
	state: Record<string, unknown>,
	path: string,
	value: unknown,
): Record<string, unknown> {
	const segments = path.replace(/^\//, "").split("/").filter(Boolean);
	if (segments.length === 0) return state;

	if (segments.length === 1) {
		return { ...state, [segments[0]]: value };
	}

	const [first, ...rest] = segments;
	const child = state[first];
	const childObj = isObjectRecord(child) ? child : {};

	return {
		...state,
		[first]: immutableSetByPath(childObj, "/" + rest.join("/"), value),
	};
}

function toInitialGenuiState(widget: ParsedGenerativeWidget): Record<string, unknown> {
	if (widget.type !== "genui-preview") return {};
	return isObjectRecord(widget.spec.state) ? { ...widget.spec.state } : {};
}

/* -------------------------------------------------------------------------- */
/*  Widget body renderers                                                     */
/* -------------------------------------------------------------------------- */

function GenuiBody({
	spec,
	previewMode,
	withContainer = true,
	onStateChange,
	progressive = false,
}: Readonly<GenuiBodyProps>): ReactNode {
	const { progressiveSpec, isProgressing } = useProgressiveSpec(spec, progressive);

	const content = (
		<JsonRenderView
			spec={progressiveSpec ?? spec}
			skipValidation={isProgressing}
			onStateChange={onStateChange}
		/>
	);

	if (!withContainer) {
		return previewMode ? (
			<div className="max-h-[65vh] overflow-auto">{content}</div>
		) : (
			content
		);
	}

	return (
		<div
			className={cn(
				"overflow-hidden rounded-md bg-surface [&>[data-slot=card]]:gap-0 [&>[data-slot=card]]:py-0 [&>[data-slot=card]>[data-slot=card-content]]:p-0 [&>[data-slot=card]>[data-slot=card-content]>div]:!p-0",
				previewMode && "max-h-[65vh] overflow-auto",
			)}
		>
			{content}
		</div>
	);
}

function AudioBody({
	audioUrl,
	transcript,
	withContainer,
}: Readonly<{
	audioUrl: string;
	transcript?: string;
	withContainer: boolean;
}>): ReactNode {
	const content = (
		<>
			<AudioPlayerElement controls preload="metadata" src={audioUrl} className="w-full" />
			{transcript ? (
				<p className={cn("text-xs text-text-subtle", withContainer ? "mt-2" : "mt-3")}>
					{transcript}
				</p>
			) : null}
		</>
	);

	return (
		<div className={withContainer ? "rounded-md bg-surface" : undefined}>
			{content}
		</div>
	);
}

function ImageBody({
	images,
	withContainer,
	onImageClick,
}: Readonly<{
	images: Array<{ url: string; mimeType?: string }>;
	withContainer: boolean;
	onImageClick?: () => void;
}>): ReactNode {
	return (
		<div className="grid place-items-center gap-2 sm:grid-cols-2">
			{images.map((image, index) => {
				const imageEl = (
					<Image
						src={image.url}
						alt={`Generated image ${index + 1}`}
						width={960}
						height={960}
						unoptimized
						className="size-full object-cover"
					/>
				);
				const containerClass = cn(
					"block overflow-hidden rounded-md aspect-square w-full",
					withContainer && "bg-surface"
				);

				return onImageClick ? (
					<button
						key={`${image.url}-${index}`}
						type="button"
						onClick={onImageClick}
						className={cn(containerClass, "cursor-pointer")}
					>
						{imageEl}
					</button>
				) : (
					<div key={`${image.url}-${index}`} className={containerClass}>
						{imageEl}
					</div>
				);
			})}
		</div>
	);
}

function renderWidgetBody(
	widget: ParsedGenerativeWidget,
	previewMode: boolean,
	withContainer = true,
	onImageClick?: () => void,
	onStateChange?: (path: string, value: unknown) => void,
	progressive = false,
): ReactNode {
	if (widget.type === "genui-preview") {
		return (
			<GenuiBody
				spec={widget.spec}
				previewMode={previewMode}
				withContainer={withContainer}
				onStateChange={onStateChange}
				progressive={progressive}
			/>
		);
	}

	if (widget.type === "audio-preview") {
		return (
			<AudioBody
				audioUrl={widget.audioUrl}
				transcript={widget.transcript}
				withContainer={withContainer}
			/>
		);
	}

	if (widget.type === "image-preview") {
		return (
			<ImageBody
				images={widget.images}
				withContainer={withContainer}
				onImageClick={onImageClick}
			/>
		);
	}

	return null;
}

/* -------------------------------------------------------------------------- */
/*  Card shell                                                                */
/* -------------------------------------------------------------------------- */

function GenerativeWidgetCardShell({
	bodyWidget,
	metadata,
	className,
	previewMode = false,
	onOpenPreview,
	onPrimaryAction,
	showPrimaryAction = false,
	primaryActionLabel,
	onStateChange,
}: Readonly<GenerativeWidgetCardShellProps>): ReactNode {
	const contentTypeLabel = formatContentTypeLabel(metadata.contentType);

	return (
		<GenerativeCard className={className}>
			<GenerativeCardHeader
				className="p-4"
				leading={<ContentTypeTile contentType={metadata.contentType} label={contentTypeLabel} />}
				title={metadata.title}
				description={metadata.description}
			/>
			<GenerativeCardBody>
				<GenerativeCardContent className="p-4">
					{renderWidgetBody(
						bodyWidget,
						previewMode,
						true,
						onOpenPreview,
						onStateChange,
						!previewMode,
					)}
				</GenerativeCardContent>
				<GenerativeCardFooter className="gap-2">
					<Button
						variant="outline"
						className="h-8 min-w-[117px]"
						disabled={previewMode}
						onClick={previewMode ? undefined : onOpenPreview}
					>
						Open preview
					</Button>
					{showPrimaryAction && primaryActionLabel ? (
						<Button
							className="h-8 min-w-[117px]"
							onClick={onPrimaryAction}
						>
							{primaryActionLabel}
						</Button>
					) : null}
				</GenerativeCardFooter>
			</GenerativeCardBody>
		</GenerativeCard>
	);
}

/* -------------------------------------------------------------------------- */
/*  Main card component                                                       */
/* -------------------------------------------------------------------------- */

export function GenerativeWidgetCard({
	widgetType,
	widgetData,
	className,
	onPrimaryAction,
}: Readonly<GenerativeWidgetCardProps>): ReactNode {
	const [previewOpen, setPreviewOpen] = useState(false);
	const parsedWidget = useMemo(
		() => parseGenerativeWidget(widgetType, widgetData),
		[widgetData, widgetType]
	);
	const metadata = useMemo(
		() => (parsedWidget ? resolveGenerativeWidgetMetadata(parsedWidget) : null),
		[parsedWidget]
	);
	const contentTypeLabel = metadata ? formatContentTypeLabel(metadata.contentType) : "";
	const [genuiState, setGenuiState] = useState<Record<string, unknown>>(
		() => (parsedWidget ? toInitialGenuiState(parsedWidget) : {})
	);
	const bodyWidget = useMemo(() => {
		if (!parsedWidget || parsedWidget.type !== "genui-preview") return parsedWidget;
		return { ...parsedWidget, spec: createBodyOnlySpec(parsedWidget) };
	}, [parsedWidget]);

	const handleGenuiStateChange = useCallback(
		(path: string, value: unknown) => {
			setGenuiState((previousState) => {
				if (!path.startsWith("/")) return previousState;
				return immutableSetByPath(previousState, path, value);
			});
		},
		[]
	);

	const shouldShowPrimaryAction =
		parsedWidget?.type === "genui-preview" &&
		Boolean(metadata?.primaryActionLabel) &&
		typeof onPrimaryAction === "function";

	const handlePrimaryAction = useCallback(() => {
		if (
			parsedWidget?.type !== "genui-preview" ||
			!metadata?.primaryActionLabel ||
			!metadata.title ||
			!metadata.description ||
			typeof onPrimaryAction !== "function"
		) {
			return;
		}

		void onPrimaryAction({
			widgetType: "genui-preview",
			actionLabel: metadata.primaryActionLabel,
			title: metadata.title,
			description: metadata.description,
			formState: genuiState,
		});
	}, [parsedWidget, metadata, onPrimaryAction, genuiState]);

	if (!parsedWidget || !metadata) return null;

	return (
		<div className={cn("pb-2", className)}>
			<Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
				<GenerativeWidgetCardShell
					bodyWidget={bodyWidget ?? parsedWidget}
					metadata={metadata}
					onOpenPreview={() => setPreviewOpen(true)}
					onPrimaryAction={handlePrimaryAction}
					showPrimaryAction={shouldShowPrimaryAction}
					primaryActionLabel={metadata.primaryActionLabel}
					onStateChange={handleGenuiStateChange}
				/>
				<DialogContent className="max-h-[90vh] overflow-hidden gap-0 p-0 sm:max-w-5xl" size="xl" showCloseButton={false}>
					<DialogHeader className="mx-0 mt-0 flex-row items-center border-b p-6">
						<div className="flex min-w-0 flex-1 items-center gap-3">
							<ContentTypeTile contentType={metadata.contentType} label={contentTypeLabel} />
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
					<div className="max-h-[65vh] overflow-y-auto p-6">
						{bodyWidget ? renderWidgetBody(
							bodyWidget,
							false,
							false,
							undefined,
							handleGenuiStateChange
						) : null}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
