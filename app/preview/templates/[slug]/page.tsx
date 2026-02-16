"use client";

import { createElement, use } from "react";
import { getDemoComponent } from "@/components/website/registry";

interface PreviewTemplatePageProps {
	params: Promise<{ slug: string }>;
}

export default function PreviewTemplatePage({ params }: PreviewTemplatePageProps) {
	const { slug } = use(params);
	const Demo = getDemoComponent(slug, "templates");

	if (!Demo) {
		return (
			<div className="flex h-screen w-screen items-center justify-center text-text-subtlest text-sm">
				Template component not found: {slug}
			</div>
		);
	}

	return createElement(Demo);
}
