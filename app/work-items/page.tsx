import { WorkItemsDashboard } from "@/components/templates/work-items/work-items-dashboard";

export const metadata = {
	title: "My Work Items - Last 7 Days",
	description: "View your recent work activity across Jira and Confluence",
};

export default function WorkItemsPage() {
	return <WorkItemsDashboard />;
}
