"use client";

import AppLayout from "@/components/projects/page";
import JiraView from "@/components/projects/jira/page";

export default function JiraPage() {
	return (
		<AppLayout product="jira">
			<JiraView />
		</AppLayout>
	);
}
