"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import CheckmarkIcon from "@atlaskit/icon/core/check-mark";
import AddIcon from "@atlaskit/icon/core/add";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import ShowMoreHorizontalIcon from "@atlaskit/icon/core/show-more-horizontal";

import { mockWorkItem, mockComments, mockLinkedItems } from "./data/mock-data";
import { WorkItemHeader } from "./components/work-item-header";
import { WorkItemDescription } from "./components/work-item-description";
import { WorkItemDetails } from "./components/work-item-details";
import { WorkItemComments } from "./components/work-item-comments";
import { WorkItemLinks } from "./components/work-item-links";

export function WorkItemDetail() {
	const [activeTab, setActiveTab] = useState<"details" | "comments" | "links" | "history">("details");

	return (
		<div className="min-h-screen bg-bg-neutral">
			<div className="max-w-6xl mx-auto p-6">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Main Content */}
					<div className="lg:col-span-2 space-y-6">
						{/* Header */}
						<WorkItemHeader workItem={mockWorkItem} />

						{/* Description */}
						<Card className="p-6 bg-surface">
							<div className="space-y-4">
								<h2 className="text-lg font-semibold text-text">Description</h2>
								<WorkItemDescription description={mockWorkItem.description} />
							</div>
						</Card>

						{/* Tabs */}
						<div className="border-b border-border">
							<div className="flex gap-1">
								{(["details", "comments", "links", "history"] as const).map(tab => (
									<button
										key={tab}
										onClick={() => setActiveTab(tab)}
										className={cn(
											"px-4 py-3 font-medium text-sm transition-colors border-b-2",
											activeTab === tab
												? "text-text border-b-border-bold"
												: "text-text-subtle border-b-transparent hover:text-text"
										)}
									>
										{tab === "details" && "Details"}
										{tab === "comments" && `Comments (${mockComments.length})`}
										{tab === "links" && `Links (${mockLinkedItems.length})`}
										{tab === "history" && "History"}
									</button>
								))}
							</div>
						</div>

						{/* Tab Content */}
						<div className="bg-surface rounded-lg p-6">
							{activeTab === "details" && <WorkItemDetails workItem={mockWorkItem} />}
							{activeTab === "comments" && <WorkItemComments comments={mockComments} />}
							{activeTab === "links" && <WorkItemLinks linkedItems={mockLinkedItems} />}
							{activeTab === "history" && (
								<div className="text-center py-8 text-text-subtle">
									Activity history coming soon
								</div>
							)}
						</div>
					</div>

					{/* Sidebar */}
					<div className="space-y-4">
						{/* Status Card */}
						<Card className="p-4 bg-surface">
							<div className="space-y-3">
								<div className="text-xs font-semibold text-text-subtle uppercase">Status</div>
								<div className="flex items-center gap-2">
									<div className="w-3 h-3 rounded-full bg-color-icon-success" />
									<span className="font-semibold text-text">{mockWorkItem.status}</span>
								</div>
								<Button variant="secondary" size="sm" className="w-full">
									<ChevronDownIcon label="" size="small" />
									Change Status
								</Button>
							</div>
						</Card>

						{/* Assignee Card */}
						<Card className="p-4 bg-surface">
							<div className="space-y-3">
								<div className="text-xs font-semibold text-text-subtle uppercase">Assignee</div>
								<div className="flex items-center gap-3">
									<Avatar className="w-8 h-8">
										<AvatarImage src={mockWorkItem.assignee.avatar} />
										<AvatarFallback>{mockWorkItem.assignee.initials}</AvatarFallback>
									</Avatar>
									<div className="flex-1">
										<div className="text-sm font-medium text-text">{mockWorkItem.assignee.name}</div>
										<div className="text-xs text-text-subtle">{mockWorkItem.assignee.role}</div>
									</div>
								</div>
								<Button variant="secondary" size="sm" className="w-full">
									Change Assignee
								</Button>
							</div>
						</Card>

						{/* Priority Card */}
						<Card className="p-4 bg-surface">
							<div className="space-y-3">
								<div className="text-xs font-semibold text-text-subtle uppercase">Priority</div>
								<Badge
									variant="secondary"
									className={cn(
										mockWorkItem.priority === "Critical" && "bg-bg-danger text-text",
										mockWorkItem.priority === "High" && "bg-bg-warning text-text",
										mockWorkItem.priority === "Medium" && "bg-bg-neutral text-text",
										mockWorkItem.priority === "Low" && "bg-bg-success text-text"
									)}
								>
									{mockWorkItem.priority}
								</Badge>
								<Button variant="secondary" size="sm" className="w-full">
									<ChevronDownIcon label="" size="small" />
									Change Priority
								</Button>
							</div>
						</Card>

						{/* Metadata */}
						<Card className="p-4 bg-surface space-y-3">
							<div className="text-xs font-semibold text-text-subtle uppercase">Details</div>

							<div className="space-y-2">
								<div className="text-xs text-text-subtle">Reporter</div>
								<div className="text-sm font-medium text-text">{mockWorkItem.reporter}</div>
							</div>

							<div className="space-y-2">
								<div className="text-xs text-text-subtle">Created</div>
								<div className="text-sm font-medium text-text">{mockWorkItem.created}</div>
							</div>

							<div className="space-y-2">
								<div className="text-xs text-text-subtle">Updated</div>
								<div className="text-sm font-medium text-text">{mockWorkItem.updated}</div>
							</div>

							{mockWorkItem.dueDate && (
								<div className="space-y-2">
									<div className="text-xs text-text-subtle">Due Date</div>
									<div className="text-sm font-medium text-text">{mockWorkItem.dueDate}</div>
								</div>
							)}
						</Card>

						{/* Labels */}
						{mockWorkItem.labels && mockWorkItem.labels.length > 0 && (
							<Card className="p-4 bg-surface">
								<div className="space-y-3">
									<div className="text-xs font-semibold text-text-subtle uppercase">Labels</div>
									<div className="flex flex-wrap gap-2">
										{mockWorkItem.labels.map(label => (
											<Badge key={label} variant="secondary">
												{label}
											</Badge>
										))}
									</div>
									<Button variant="secondary" size="sm" className="w-full">
										<AddIcon label="" size="small" />
										Add Label
									</Button>
								</div>
							</Card>
						)}

						{/* Actions */}
						<div className="flex gap-2">
							<Button size="sm" className="flex-1">
								<CheckmarkIcon label="" size="small" />
								Resolve
							</Button>
							<Button size="sm" variant="ghost">
								<ShowMoreHorizontalIcon label="" size="small" />
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
