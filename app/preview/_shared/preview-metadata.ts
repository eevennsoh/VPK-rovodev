import type { Metadata } from "next";
import { getPreviewPageTitle } from "@/lib/template-page-title";
import type { PreviewCategory } from "./preview-types";

export interface PreviewLayoutProps {
	params: Promise<{ slug: string }>;
	children: React.ReactNode;
}

export async function getCategoryPreviewMetadata(
	params: Promise<{ slug: string }>,
	category: PreviewCategory,
): Promise<Metadata> {
	const { slug } = await params;
	return { title: getPreviewPageTitle(slug, category) };
}

export function PreviewCategoryLayout({ children }: Readonly<PreviewLayoutProps>) {
	return children;
}
