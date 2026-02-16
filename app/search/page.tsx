"use client";

import AppLayout from "@/components/templates/page";
import SearchResultsView from "@/components/templates/search/page";

export default function SearchPage() {
	return (
		<AppLayout product="search">
			<SearchResultsView />
		</AppLayout>
	);
}
