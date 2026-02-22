"use client";

import { RenderPreviewCategoryPage } from "@/app/preview/_shared/render-preview-category-page";

interface PreviewVisualPageProps {
	params: Promise<{ slug: string }>;
}

export default function PreviewVisualPage({ params }: PreviewVisualPageProps) {
	return <RenderPreviewCategoryPage params={params} category="visual" />;
}
