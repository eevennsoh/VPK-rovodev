"use client";

import { use, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Empty } from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import { WorkItemsTimeline } from "./work-items-timeline";
import { WorkItemsGrid } from "./work-items-grid";

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

interface WorkItemsResponse {
	success: boolean;
	total: number;
	jiraCount: number;
	confluenceCount: number;
	items: WorkItem[];
}

async function fetchWorkItems(): Promise<WorkItemsResponse> {
	const response = await fetch("/api/work-items");
	if (!response.ok) {
		throw new Error("Failed to fetch work items");
	}
	return response.json();
}

export function WorkItemsDashboard() {
	const [searchQuery, setSearchQuery] = useState("");
	const [filterType, setFilterType] = useState<"all" | "jira" | "confluence">("all");
	const [filterStatus, setFilterStatus] = useState<string>("all");
	const [data, setData] = useState<WorkItemsResponse | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Fetch data on mount
	use(
		(async () => {
			try {
				const result = await fetchWorkItems();
				setData(result);
			} catch (err) {
				setError(err instanceof Error ? err.message : "An error occurred");
			} finally {
				setIsLoading(false);
			}
		})()
	);

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="flex flex-col items-center gap-4">
					<Spinner size="lg" />
					<p className="text-text-subtle">Loading your work items...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<Empty className="mx-auto gap-6 py-12">
					<div className="flex flex-col items-center gap-2">
						<h4 className="text-text">Failed to load work items</h4>
						<p className="text-sm/relaxed text-text-subtle">{error}</p>
						<Button onClick={() => window.location.reload()}>Try Again</Button>
					</div>
				</Empty>
			</div>
		);
	}

	if (!data) {
		return null;
	}

	// Filter items
	const filteredItems = data.items.filter((item) => {
		const matchesSearch = item.title
			.toLowerCase()
			.includes(searchQuery.toLowerCase());
		const matchesType = filterType === "all" || item.type === filterType;
		const matchesStatus =
			filterStatus === "all" || item.status === filterStatus;
		return matchesSearch && matchesType && matchesStatus;
	});

	// Get unique statuses for filter
	const uniqueStatuses = Array.from(
		new Set(data.items.map((item) => item.status))
	).sort();

	return (
		<div className="container mx-auto space-y-6 py-8">
			{/* Header */}
			<div className="space-y-2">
				<h1 className="text-3xl font-bold">My Work Items</h1>
				<p className="text-text-subtle">
					Last 7 days • {data.total} total items ({data.jiraCount} Jira,{" "}
					{data.confluenceCount} Confluence)
				</p>
			</div>

			{/* Filters */}
			<Card className="p-6">
				<div className="space-y-4">
					<div className="flex flex-wrap gap-4">
						{/* Search */}
						<div className="flex-1 min-w-[200px]">
							<Label htmlFor="search">Search</Label>
							<Input
								id="search"
								placeholder="Search work items..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>

						{/* Type Filter */}
						<div className="min-w-[150px]">
							<Label htmlFor="type-filter">Source</Label>
							<select
								id="type-filter"
								value={filterType}
								onChange={(e) =>
									setFilterType(e.target.value as "all" | "jira" | "confluence")
								}
								className="w-full rounded-md border border-border-input bg-surface px-3 py-2 text-sm"
							>
								<option value="all">All Sources</option>
								<option value="jira">Jira Only</option>
								<option value="confluence">Confluence Only</option>
							</select>
						</div>

						{/* Status Filter */}
						<div className="min-w-[150px]">
							<Label htmlFor="status-filter">Status</Label>
							<select
								id="status-filter"
								value={filterStatus}
								onChange={(e) => setFilterStatus(e.target.value)}
								className="w-full rounded-md border border-border-input bg-surface px-3 py-2 text-sm"
							>
								<option value="all">All Statuses</option>
								{uniqueStatuses.map((status) => (
									<option key={status} value={status}>
										{status}
									</option>
								))}
							</select>
						</div>
					</div>

					{/* Results count */}
					<p className="text-sm text-text-subtle">
						Showing {filteredItems.length} of {data.total} items
					</p>
				</div>
			</Card>

			{/* Views */}
			<Tabs defaultValue="timeline" className="space-y-4">
				<TabsList>
					<TabsTrigger value="timeline">Timeline</TabsTrigger>
					<TabsTrigger value="grid">Card Grid</TabsTrigger>
					<TabsTrigger value="table">Table</TabsTrigger>
				</TabsList>

				<TabsContent value="timeline" className="space-y-4">
					{filteredItems.length === 0 ? (
						<Empty className="mx-auto gap-6 py-12">
							<div className="flex flex-col items-center gap-2">
								<h4 className="text-text">No work items found</h4>
								<p className="text-sm/relaxed text-text-subtle">
									Try adjusting your filters or search query
								</p>
							</div>
						</Empty>
					) : (
						<WorkItemsTimeline items={filteredItems} />
					)}
				</TabsContent>

				<TabsContent value="grid" className="space-y-4">
					{filteredItems.length === 0 ? (
						<Empty className="mx-auto gap-6 py-12">
							<div className="flex flex-col items-center gap-2">
								<h4 className="text-text">No work items found</h4>
								<p className="text-sm/relaxed text-text-subtle">
									Try adjusting your filters or search query
								</p>
							</div>
						</Empty>
					) : (
						<WorkItemsGrid items={filteredItems} />
					)}
				</TabsContent>

				<TabsContent value="table" className="space-y-4">
					{filteredItems.length === 0 ? (
						<Empty className="mx-auto gap-6 py-12">
							<div className="flex flex-col items-center gap-2">
								<h4 className="text-text">No work items found</h4>
								<p className="text-sm/relaxed text-text-subtle">
									Try adjusting your filters or search query
								</p>
							</div>
						</Empty>
					) : (
						<Card>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Title</TableHead>
										<TableHead>Type</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Priority</TableHead>
										<TableHead>Updated</TableHead>
										<TableHead>Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredItems.map((item) => (
										<TableRow key={item.id}>
											<TableCell className="font-medium">
												{item.title}
												{item.project && (
													<span className="ml-2 text-xs text-text-subtle">
														{item.project}
													</span>
												)}
											</TableCell>
											<TableCell>
												<Badge
													variant={item.type === "jira" ? "default" : "secondary"}
												>
													{item.source}
												</Badge>
											</TableCell>
											<TableCell>
												<Badge variant="outline">{item.status}</Badge>
											</TableCell>
											<TableCell>
												{item.priority && (
													<Badge
														variant={
															item.priority === "High" ||
															item.priority === "Highest"
																? "danger"
																: "secondary"
														}
													>
														{item.priority}
													</Badge>
												)}
											</TableCell>
											<TableCell className="text-text-subtle">
												{new Intl.DateTimeFormat(undefined, {
													dateStyle: "medium",
													timeStyle: "short",
												}).format(new Date(item.updated))}
											</TableCell>
											<TableCell>
												{item.url && (
													<Button
														variant="link"
														size="sm"
														onClick={() => window.open(item.url, "_blank")}
													>
														View
													</Button>
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</Card>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
