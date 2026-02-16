"use client";

import AppLayout from "@/components/templates/page";
import JiraView from "@/components/templates/jira/page";

export default function JiraPage() {
	return (
		<AppLayout product="jira">
			<JiraView />
		</AppLayout>
	);
}
