"use client";

import AppLayout from "@/components/projects/page";
import SearchResultsView from "@/components/projects/search/page";

export default function SearchPage() {
	return (
		<AppLayout product="search">
			<SearchResultsView />
		</AppLayout>
	);
}
