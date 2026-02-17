import type { Metadata } from "next";
import { getPreviewPageTitle } from "@/lib/template-page-title";

interface LayoutProps {
	params: Promise<{ slug: string }>;
	children: React.ReactNode;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
	const { slug } = await params;
	return { title: getPreviewPageTitle(slug, "blocks") };
}

export default function PreviewBlockLayout({ children }: LayoutProps) {
	return children;
}
