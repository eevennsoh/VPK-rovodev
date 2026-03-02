"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { PlusCircleIcon, PencilIcon, Trash2Icon } from "lucide-react";
import type { ActivityLogEntry } from "@/lib/inventory-types";

interface ActivityLogProps {
	entries: ActivityLogEntry[];
}

const ACTION_CONFIG = {
	added: {
		icon: PlusCircleIcon,
		label: "Added",
		variant: "outline" as const,
		className: "text-text-success border-border-success",
	},
	updated: {
		icon: PencilIcon,
		label: "Updated",
		variant: "outline" as const,
		className: "text-text-information border-border-information",
	},
	deleted: {
		icon: Trash2Icon,
		label: "Deleted",
		variant: "outline" as const,
		className: "text-text-danger border-border-danger",
	},
};

function formatTimestamp(timestamp: string): string {
	const date = new Date(timestamp);
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

export function ActivityLog({ entries }: ActivityLogProps) {
	return (
		<Card className="flex flex-col">
			<CardHeader>
				<CardTitle>Activity Log</CardTitle>
				<CardDescription>Recent inventory changes</CardDescription>
			</CardHeader>
			<CardContent className="flex-1 p-0">
				<ScrollArea className="h-[400px] px-6">
					{entries.length === 0 ? (
						<p className="text-muted-foreground py-8 text-center text-sm">
							No activity recorded yet.
						</p>
					) : (
						<div className="space-y-4 pb-4">
							{entries.map((entry) => {
								const config = ACTION_CONFIG[entry.action];
								const ActionIcon = config.icon;
								return (
									<div
										key={entry.id}
										className="flex items-start gap-3 rounded-lg border p-3"
									>
										<div className="mt-0.5 shrink-0">
											<ActionIcon className="size-4 text-icon-subtle" />
										</div>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<span className="truncate text-sm font-medium">
													{entry.itemName}
												</span>
												<Badge
													variant={config.variant}
													className={`shrink-0 text-xs ${config.className}`}
												>
													{config.label}
												</Badge>
											</div>
											<p className="text-muted-foreground mt-0.5 text-xs">
												{entry.details}
											</p>
											<p className="text-muted-foreground mt-1 text-xs">
												{formatTimestamp(entry.timestamp)}
											</p>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</ScrollArea>
			</CardContent>
		</Card>
	);
}
