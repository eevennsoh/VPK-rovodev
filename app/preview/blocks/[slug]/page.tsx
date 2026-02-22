"use client";

import { RenderPreviewCategoryPage } from "@/app/preview/_shared/render-preview-category-page";

interface PreviewBlockPageProps {
	params: Promise<{ slug: string }>;
}

export default function PreviewBlockPage({ params }: PreviewBlockPageProps) {
	return <RenderPreviewCategoryPage params={params} category="blocks" />;
}
