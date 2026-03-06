import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomeContent, type HomeCategory } from "../home-content";
import { getCategoryDisplayName } from "@/lib/project-page-title";

interface PageProps {
	params: Promise<{ category: string }>;
}

const VALID_CATEGORIES = ["ui", "ui-ai", "blocks", "projects", "utility", "visual"] as const;
type ValidCategory = (typeof VALID_CATEGORIES)[number];

function isValidCategory(value: string): value is ValidCategory {
	return (VALID_CATEGORIES as readonly string[]).includes(value);
}

export function generateStaticParams() {
	return VALID_CATEGORIES.map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { category } = await params;
	if (!isValidCategory(category)) return {};
	return { title: getCategoryDisplayName(category) };
}

export default async function CategoryPage({ params }: PageProps) {
	const { category } = await params;

	if (!isValidCategory(category)) {
		notFound();
	}

	return <HomeContent category={category satisfies HomeCategory} />;
}
