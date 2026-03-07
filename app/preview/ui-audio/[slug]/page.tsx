"use client";

import { RenderPreviewCategoryPage } from "@/app/preview/_shared/render-preview-category-page";

interface PreviewUiAudioPageProps {
	params: Promise<{ slug: string }>;
}

export default function PreviewUiAudioPage({ params }: PreviewUiAudioPageProps) {
	return <RenderPreviewCategoryPage params={params} category="ui-audio" />;
}
