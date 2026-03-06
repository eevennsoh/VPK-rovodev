"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WorkItem {
	id: string;
	type: "jira" | "confluence";
	title: string;
	status: string;
	assignee?: string;
	updated: string;
	created: string;
	priority?: string;
	issueType?: string;
	project?: string;
	url?: string;
	source: string;
}

interface WorkItemsGridProps {
	items: WorkItem[];
}

function getStatusColor(status: string): string {
	const lowerStatus = status.toLowerCase();
	if (
		lowerStatus.includes("done") ||
		lowerStatus.includes("resolved") ||
		lowerStatus.includes("closed")
	) {
		return "border-l-border-success";
	}
	if (
		lowerStatus.includes("in progress") ||
		lowerStatus.includes("in-progress")
	) {
		return "border-l-border-info";
	}
	if (
		lowerStatus.includes("blocked") ||
		lowerStatus.includes("on hold")
	) {
		return "border-l-border-danger";
	}
	return "border-l-border";
}

function getPriorityIcon(priority?: string): string {
	if (!priority) return "";
	const lower = priority.toLowerCase();
	if (lower.includes("highest") || lower.includes("critical")) return "🔴";
	if (lower.includes("high")) return "🟠";
	if (lower.includes("medium")) return "🟡";
	if (lower.includes("low")) return "🟢";
	return "";
}

export function WorkItemsGrid({ items }: WorkItemsGridProps) {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{items.map((item) => (
				<Card
					key={item.id}
					className={cn(
						"border-l-4 transition-all hover:shadow-lg",
						getStatusColor(item.status)
					)}
				>
					<div className="flex h-full flex-col gap-3 p-4">
						{/* Header */}
						<div className="flex items-start justify-between gap-2">
							<Badge
								variant={item.type === "jira" ? "default" : "secondary"}
								className="shrink-0"
							>
								{item.source}
							</Badge>
							{item.priority && (
								<span className="text-lg" title={item.priority}>
									{getPriorityIcon(item.priority)}
								</span>
							)}
						</div>

						{/* Title */}
						<h3 className="line-clamp-2 flex-1 font-medium leading-snug">
							{item.title}
						</h3>

						{/* Project/Type */}
						{(item.project || item.issueType) && (
							<div className="flex flex-wrap gap-2 text-xs text-text-subtle">
								{item.project && <span>{item.project}</span>}
								{item.issueType && item.project && <span>•</span>}
								{item.issueType && <span>{item.issueType}</span>}
							</div>
						)}

						{/* Status */}
						<div className="flex items-center gap-2">
							<Badge variant="outline" className="text-xs">
								{item.status}
							</Badge>
						</div>

						{/* Assignee */}
						{item.assignee && (
							<p className="text-xs text-text-subtle">
								👤 {item.assignee}
							</p>
						)}

						{/* Footer */}
						<div className="flex items-center justify-between border-t border-border-subtle pt-3">
							<span className="text-xs text-text-subtle">
								{new Intl.DateTimeFormat(undefined, {
									month: "short",
									day: "numeric",
								}).format(new Date(item.updated))}
							</span>
							{item.url && (
								<Button
									variant="link"
									size="sm"
									onClick={() => window.open(item.url, "_blank")}
									className="h-auto p-0 text-xs"
								>
									View →
								</Button>
							)}
						</div>
					</div>
				</Card>
			))}
		</div>
	);
}
