"use client";

import WorkItemsWidget from "@/components/blocks/work-item-widget/page";
import type { WorkItemsData } from "@/components/blocks/work-item-widget/lib/types";

const MOCK_DATA: WorkItemsData = {
	items: [
		{ key: "VPK-101", summary: "Update navigation component", status: "In Progress", priority: "High" },
		{ key: "VPK-102", summary: "Fix sidebar collapse animation", status: "To Do", priority: "Medium" },
		{ key: "VPK-103", summary: "Add dark mode support", status: "Done", priority: "Low" },
		{ key: "VPK-104", summary: "Implement search filters", status: "In Progress", priority: "High" },
	],
	assignedTo: "Demo User",
};

export default function WidgetDemo() {
	return (
		<div className="mx-auto max-w-[400px] p-6">
			<WorkItemsWidget data={MOCK_DATA} />
		</div>
	);
}
