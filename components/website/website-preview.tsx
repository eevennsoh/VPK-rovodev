"use client";

import { Suspense, type ComponentType } from "react";
import { getDemoComponent } from "./registry";

interface WebsitePreviewProps {
	slug: string;
	name: string;
	importPath: string;
	category: "ui-ai" | "ui" | "blocks" | "templates" | "visual";
}

function WebsitePreviewSkeleton() {
	return (
		<div className="w-20 h-20 rounded-lg bg-bg-neutral animate-pulse" />
	);
}

function TextFallback({ name, importPath }: Readonly<{ name: string; importPath: string }>) {
	return (
		<div className="flex flex-col items-center gap-2">
			<span className="text-2xl font-semibold text-text tracking-tight">
				{name}
			</span>
			<code className="text-[11px] text-text-subtlest font-mono">
				{importPath}
			</code>
		</div>
	);
}

function WebsitePreviewWrapper({ Demo }: Readonly<{ Demo: ComponentType }>) {
	return (
		<Suspense fallback={<WebsitePreviewSkeleton />}>
			<Demo />
		</Suspense>
	);
}

export function WebsitePreview({ slug, name, importPath, category }: Readonly<WebsitePreviewProps>) {
	const Demo: ComponentType | null = getDemoComponent(slug, category);

	if (!Demo) {
		return <TextFallback name={name} importPath={importPath} />;
	}

	return <WebsitePreviewWrapper Demo={Demo} />;
}
