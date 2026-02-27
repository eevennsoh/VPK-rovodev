"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

interface WorkItemsTimelineProps {
	items: WorkItem[];
}

function formatDate(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) {
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		if (diffHours === 0) {
			const diffMins = Math.floor(diffMs / (1000 * 60));
			return diffMins <= 1 ? "just now" : `${diffMins}m ago`;
		}
		return diffHours === 1 ? "1h ago" : `${diffHours}h ago`;
	}
	if (diffDays === 1) return "yesterday";
	if (diffDays < 7) return `${diffDays}d ago`;

	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

function getStatusColor(status: string): string {
	const lowerStatus = status.toLowerCase();
	if (
		lowerStatus.includes("done") ||
		lowerStatus.includes("resolved") ||
		lowerStatus.includes("closed")
	) {
		return "bg-success-subtle text-text-success";
	}
	if (
		lowerStatus.includes("in progress") ||
		lowerStatus.includes("in-progress")
	) {
		return "bg-info-subtle text-text-info";
	}
	if (
		lowerStatus.includes("todo") ||
		lowerStatus.includes("to do") ||
		lowerStatus.includes("backlog")
	) {
		return "bg-neutral-subtle text-text";
	}
	if (lowerStatus.includes("blocked") || lowerStatus.includes("blocked")) {
		return "bg-danger-subtle text-text-danger";
	}
	return "bg-neutral-subtle text-text";
}

function getPriorityColor(priority?: string): string {
	if (!priority) return "";
	const lower = priority.toLowerCase();
	if (lower.includes("highest") || lower.includes("critical"))
		return "bg-danger-subtle text-text-danger";
	if (lower.includes("high")) return "bg-warning-subtle text-text-warning";
	if (lower.includes("low")) return "bg-neutral-subtle text-text-subtle";
	return "bg-neutral-subtle text-text-subtle";
}

export function WorkItemsTimeline({ items }: WorkItemsTimelineProps) {
	// Group items by date
	const grouped = items.reduce(
		(acc, item) => {
			const date = new Date(item.updated);
			const dateKey = new Intl.DateTimeFormat(undefined, {
				year: "numeric",
				month: "long",
				day: "numeric",
			}).format(date);
			if (!acc[dateKey]) acc[dateKey] = [];
			acc[dateKey].push(item);
			return acc;
		},
		{} as Record<string, WorkItem[]>
	);

	return (
		<div className="space-y-8">
			{Object.entries(grouped).map(([dateKey, dateItems]) => (
				<div key={dateKey} className="space-y-4">
					{/* Date header */}
					<div className="flex items-center gap-4">
						<h3 className="text-sm font-semibold text-text-subtle">{dateKey}</h3>
						<div className="h-px flex-1 bg-border-subtle" />
					</div>

					{/* Items for this date */}
					<div className="space-y-3">
						{dateItems.map((item) => (
							<Card key={item.id} className="border-l-4 border-l-border-bold">
								<div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
									{/* Left side - content */}
									<div className="flex-1 space-y-2">
										{/* Title and source */}
										<div className="flex items-start gap-2">
											<h4 className="flex-1 font-medium leading-tight">
												{item.title}
											</h4>
											<Badge
												variant={item.type === "jira" ? "default" : "secondary"}
												className="shrink-0"
											>
												{item.source}
											</Badge>
										</div>

										{/* Meta information */}
										<div className="flex flex-wrap gap-2">
											<Badge variant="outline" className={getStatusColor(item.status)}>
												{item.status}
											</Badge>

											{item.priority && (
												<Badge
													variant="outline"
													className={getPriorityColor(item.priority)}
												>
													{item.priority}
												</Badge>
											)}

											{item.issueType && (
												<span className="text-xs text-text-subtle">
													{item.issueType}
												</span>
											)}

											{item.project && (
												<span className="text-xs text-text-subtle">
													{item.project}
												</span>
											)}
										</div>

										{/* Assignee */}
										{item.assignee && (
											<p className="text-xs text-text-subtle">
												Assigned to: {item.assignee}
											</p>
										)}
									</div>

									{/* Right side - time and action */}
									<div className="flex flex-col items-start gap-2 sm:items-end">
										<span className="text-xs text-text-subtle">
											{formatDate(item.updated)}
										</span>
										{item.url && (
											<Button
												variant="outline"
												size="sm"
												onClick={() => window.open(item.url, "_blank")}
											>
												View
											</Button>
										)}
									</div>
								</div>
							</Card>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
