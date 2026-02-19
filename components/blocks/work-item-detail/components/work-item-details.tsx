"use client";

import { type WorkItem } from "../types";

interface WorkItemDetailsProps {
	workItem: Readonly<WorkItem>;
}

export function WorkItemDetails({ workItem }: WorkItemDetailsProps) {
	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{workItem.storyPoints && (
					<div>
						<div className="text-xs font-semibold text-text-subtle uppercase mb-2">Story Points</div>
						<div className="text-2xl font-bold text-text">{workItem.storyPoints}</div>
					</div>
				)}

				{workItem.estimatedHours && (
					<div>
						<div className="text-xs font-semibold text-text-subtle uppercase mb-2">
							Estimated Hours
						</div>
						<div className="text-2xl font-bold text-text">{workItem.estimatedHours}h</div>
					</div>
				)}

				{workItem.components && workItem.components.length > 0 && (
					<div className="col-span-1 md:col-span-2">
						<div className="text-xs font-semibold text-text-subtle uppercase mb-2">Components</div>
						<div className="flex flex-wrap gap-2">
							{workItem.components.map(component => (
								<div key={component} className="text-sm font-medium text-text bg-bg-neutral px-3 py-1 rounded">
									{component}
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
