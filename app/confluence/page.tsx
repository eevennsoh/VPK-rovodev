"use client";

import AppLayout from "@/components/projects/page";
import ConfluenceView from "@/components/projects/confluence/page";

export default function ConfluencePage() {
	return (
		<AppLayout product="confluence">
			<ConfluenceView />
		</AppLayout>
	);
}
