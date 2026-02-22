"use client";

import { createElement, use } from "react";
import { getDemoComponent } from "@/components/website/registry";
import { getCategoryDisplayName } from "@/lib/template-page-title";
import type { PreviewCategory } from "./preview-types";

interface PreviewCategoryPageProps {
	params: Promise<{ slug: string }>;
	category: PreviewCategory;
}

export function RenderPreviewCategoryPage({ params, category }: Readonly<PreviewCategoryPageProps>) {
	const { slug } = use(params);
	const Demo = getDemoComponent(slug, category);

	if (!Demo) {
		return (
			<div className="flex h-screen w-screen items-center justify-center text-text-subtlest text-sm">
				{getCategoryDisplayName(category)} component not found: {slug}
			</div>
		);
	}

	return createElement(Demo);
}
