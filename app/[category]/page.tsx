import { notFound } from "next/navigation";
import { HomeContent, type HomeCategory } from "../home-content";

interface PageProps {
	params: Promise<{ category: string }>;
}

const VALID_CATEGORIES = ["ui", "ui-ai", "blocks", "templates", "utility", "visual"] as const;
type ValidCategory = (typeof VALID_CATEGORIES)[number];

function isValidCategory(value: string): value is ValidCategory {
	return (VALID_CATEGORIES as readonly string[]).includes(value);
}

export function generateStaticParams() {
	return VALID_CATEGORIES.map((category) => ({ category }));
}

export default async function CategoryPage({ params }: PageProps) {
	const { category } = await params;

	if (!isValidCategory(category)) {
		notFound();
	}

	return <HomeContent category={category satisfies HomeCategory} />;
}
