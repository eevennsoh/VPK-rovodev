"use client";

import { Card } from "@/components/ui/card";
import { mockWorkItem, mockComments, mockLinkedItems } from "./data/mock-data";
import { WorkItemHeader } from "./components/work-item-header";
import { WorkItemDescription } from "./components/work-item-description";
import { WorkItemTabs } from "./components/work-item-tabs";
import { WorkItemSidebar } from "./components/work-item-sidebar";

export function WorkItemDetail() {
	return (
		<div className="min-h-screen bg-bg-neutral">
			<div className="max-w-6xl mx-auto p-6">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Main Content */}
					<div className="lg:col-span-2 space-y-6">
						<WorkItemHeader workItem={mockWorkItem} />

						<Card className="p-6 bg-surface">
							<div className="space-y-4">
								<h2 className="text-lg font-semibold text-text">Description</h2>
								<WorkItemDescription description={mockWorkItem.description} />
							</div>
						</Card>

						<WorkItemTabs
							workItem={mockWorkItem}
							comments={mockComments}
							linkedItems={mockLinkedItems}
						/>
					</div>

					{/* Sidebar */}
					<WorkItemSidebar workItem={mockWorkItem} />
				</div>
			</div>
		</div>
	);
}
