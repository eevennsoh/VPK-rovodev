"use client";

import { createElement, use } from "react";
import { getDemoComponent } from "@/components/website/registry";

interface PreviewUtilityPageProps {
	params: Promise<{ slug: string }>;
}

export default function PreviewUtilityPage({ params }: PreviewUtilityPageProps) {
	const { slug } = use(params);
	const Demo = getDemoComponent(slug, "utility");

	if (!Demo) {
		return (
			<div className="flex h-screen w-screen items-center justify-center text-text-subtlest text-sm">
				Utility component not found: {slug}
			</div>
		);
	}

	return createElement(Demo);
}
