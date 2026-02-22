"use client";

import { RenderPreviewCategoryPage } from "@/app/preview/_shared/render-preview-category-page";

interface PreviewUtilityPageProps {
	params: Promise<{ slug: string }>;
}

export default function PreviewUtilityPage({ params }: PreviewUtilityPageProps) {
	return <RenderPreviewCategoryPage params={params} category="utility" />;
}
