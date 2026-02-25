"use client";

import { createElement, Suspense } from "react";
import { token } from "@/lib/tokens";
import { getDemoComponent } from "@/components/website/registry";
import { Button } from "@/components/ui/button";
import { DocSection } from "./doc-section";
import { DemoPreviewShell } from "./demo-preview-shell";
import FullscreenEnterIcon from "@atlaskit/icon/core/fullscreen-enter";

interface DocPreviewProps {
	slug: string;
	category: "ui-ai" | "ui" | "blocks" | "templates" | "utility" | "visual";
}

function PreviewSkeleton() {
	return (
		<div
			style={{
				display: "flex",
				width: "100%",
				alignItems: "center",
				justifyContent: "center",
				minHeight: 120,
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

export function DocPreview({ slug, category }: Readonly<DocPreviewProps>) {
	const Demo = getDemoComponent(slug, category);

	if (!Demo) {
		return null;
	}

	const fullViewAction = (
		<Button variant="link" size="sm" nativeButton={false} render={<a href={`/preview/${category}/${slug}`} />}>
			<FullscreenEnterIcon label="" />
			Fullscreen
		</Button>
	);

	const isFullPage = category === "templates" || category === "blocks";

	return (
		<DocSection id="preview" title="Preview" action={fullViewAction}>
			<DemoPreviewShell fullPage={isFullPage}>
				<Suspense fallback={<PreviewSkeleton />}>
					{createElement(Demo)}
				</Suspense>
			</DemoPreviewShell>
		</DocSection>
	);
}
