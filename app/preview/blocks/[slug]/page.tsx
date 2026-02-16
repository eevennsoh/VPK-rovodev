"use client";

import { createElement, use } from "react";
import { getDemoComponent } from "@/components/website/registry";

interface PreviewBlockPageProps {
	params: Promise<{ slug: string }>;
}

export default function PreviewBlockPage({ params }: PreviewBlockPageProps) {
	const { slug } = use(params);
	const Demo = getDemoComponent(slug, "blocks");

	if (!Demo) {
		return (
			<div className="flex h-screen w-screen items-center justify-center text-text-subtlest text-sm">
				Block not found: {slug}
			</div>
		);
	}

	return createElement(Demo);
}
