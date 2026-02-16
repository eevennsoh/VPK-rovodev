"use client";

import type { CSSProperties } from "react";
import { Suspense, type ComponentType } from "react";
import { token } from "@/lib/tokens";
import type { DemoLayout } from "@/app/data/component-detail-types";
import { getDemoComponent } from "@/components/website/registry";
import { Button } from "@/components/ui/button";
import { DocSection } from "./doc-section";
import FullscreenEnterIcon from "@atlaskit/icon/core/fullscreen-enter";

interface DocPreviewProps {
	slug: string;
	category: "ui-ai" | "ui" | "blocks" | "templates" | "utility" | "visual";
	variant?: "default" | "block";
	demoLayout?: DemoLayout;
}

function PreviewSkeleton() {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				minHeight: 200,
			}}
		>
			<div
				style={{
					width: 80,
					height: 80,
					borderRadius: 8,
					backgroundColor: token("color.background.neutral"),
					animation: "pulse 2s ease-in-out infinite",
				}}
			/>
		</div>
	);
}

interface PreviewWrapperProps {
	Demo: ComponentType;
	wrapperStyle?: CSSProperties;
}

function PreviewWrapper({ Demo, wrapperStyle }: Readonly<PreviewWrapperProps>) {
	return (
		<Suspense fallback={<PreviewSkeleton />}>
			<div style={wrapperStyle}>
				<Demo />
			</div>
		</Suspense>
	);
}

export function DocPreview({ slug, category, variant = "default", demoLayout }: Readonly<DocPreviewProps>) {
	const Demo = getDemoComponent(slug, category);
	const isBlockVariant = variant === "block";
	const isFullWidthPreview = demoLayout?.previewContentWidth === "full";

	if (!Demo) {
		return null;
	}

	const containerStyle: CSSProperties = isBlockVariant
		? {
				minHeight: 200,
				padding: token("space.300"),
				border: `1px solid ${token("color.border")}`,
				borderRadius: token("radius.large"),
				backgroundColor: token("elevation.surface"),
				width: "100%",
				maxWidth: "100%",
				overflow: "auto",
			}
		: {
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				minHeight: 200,
				padding: token("space.400"),
				border: `1px solid ${token("color.border")}`,
				borderRadius: token("radius.large"),
				backgroundColor: token("elevation.surface"),
			};
	const previewWrapperStyle: CSSProperties | undefined = isBlockVariant
		? {
				width: isFullWidthPreview ? "100%" : "max-content",
				minWidth: "100%",
				position: "relative",
				isolation: "isolate",
				transform: "translateZ(0)",
			}
		: isFullWidthPreview
			? {
					width: "100%",
					maxWidth: "100%",
				}
			: undefined;

	const hasPreviewRoute = category === "blocks" || category === "templates" || category === "utility";
	const fullViewAction = hasPreviewRoute ? (
		<Button variant="link" size="sm" nativeButton={false} render={<a href={`/preview/${category}/${slug}`} />}>
			<FullscreenEnterIcon label="" />
			Fullscreen
		</Button>
	) : undefined;

	return (
		<DocSection id="preview" title="Preview" action={fullViewAction}>
			<div style={containerStyle}>
				<PreviewWrapper Demo={Demo} wrapperStyle={previewWrapperStyle} />
			</div>
		</DocSection>
	);
}
