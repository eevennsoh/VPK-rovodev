import { notFound } from "next/navigation";
import { AI_COMPONENTS, UI_COMPONENTS, BLOCK_COMPONENTS, TEMPLATE_COMPONENTS, UTILITY_COMPONENTS, VISUAL_COMPONENTS, findComponent } from "@/app/data/components";
import { ComponentDoc } from "@/components/website/component-doc/page";

interface PageProps {
	params: Promise<{
		category: string;
		slug: string;
	}>;
}

export function generateStaticParams() {
	const params: { category: string; slug: string }[] = [];

	for (const comp of AI_COMPONENTS) {
		params.push({ category: "ui-ai", slug: comp.slug });
	}

	for (const comp of UI_COMPONENTS) {
		params.push({ category: "ui", slug: comp.slug });
	}

	for (const comp of BLOCK_COMPONENTS) {
		params.push({ category: "blocks", slug: comp.slug });
	}

	for (const comp of TEMPLATE_COMPONENTS) {
		params.push({ category: "templates", slug: comp.slug });
	}

	for (const comp of UTILITY_COMPONENTS) {
		params.push({ category: "utility", slug: comp.slug });
	}

	for (const comp of VISUAL_COMPONENTS) {
		params.push({ category: "visual", slug: comp.slug });
	}

	return params;
}

export default async function ComponentDetailPage({ params }: PageProps) {
	const { category, slug } = await params;

	if (category !== "ui-ai" && category !== "ui" && category !== "blocks" && category !== "templates" && category !== "utility" && category !== "visual") {
		notFound();
	}

	const component = findComponent(category, slug);

	if (!component) {
		notFound();
	}

	return <ComponentDoc component={component} />;
}
