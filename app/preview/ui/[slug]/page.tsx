"use client";

import { RenderPreviewCategoryPage } from "@/app/preview/_shared/render-preview-category-page";

interface PreviewUiPageProps {
	params: Promise<{ slug: string }>;
}

export default function PreviewUiPage({ params }: PreviewUiPageProps) {
	return <RenderPreviewCategoryPage params={params} category="ui" />;
}
