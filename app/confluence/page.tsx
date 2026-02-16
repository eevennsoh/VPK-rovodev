"use client";

import AppLayout from "@/components/templates/page";
import ConfluenceView from "@/components/templates/confluence/page";

export default function ConfluencePage() {
	return (
		<AppLayout product="confluence">
			<ConfluenceView />
		</AppLayout>
	);
}
