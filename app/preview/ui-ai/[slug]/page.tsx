"use client";

import { RenderPreviewCategoryPage } from "@/app/preview/_shared/render-preview-category-page";

interface PreviewUiAiPageProps {
	params: Promise<{ slug: string }>;
}

export default function PreviewUiAiPage({ params }: PreviewUiAiPageProps) {
	return <RenderPreviewCategoryPage params={params} category="ui-ai" />;
}
