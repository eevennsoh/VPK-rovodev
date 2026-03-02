"use client";

import { useState, useMemo } from "react";
import { useAssetRequestStorage } from "@/hooks/use-asset-request-storage";
import { AssetRequestForm } from "@/components/blocks/asset-request/asset-request-form";
import { AssetRequestList } from "@/components/blocks/asset-request/asset-request-list";
import { AssetRequestAdmin } from "@/components/blocks/asset-request/asset-request-admin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lozenge } from "@/components/ui/lozenge";

export function AssetRequestsDashboard() {
	const { requests, isLoading, addRequest, updateStatus, reset } =
		useAssetRequestStorage();
	const [activeTab, setActiveTab] = useState("request");

	const counts = useMemo(() => {
		const submitted = requests.filter((r) => r.status === "submitted").length;
		const approved = requests.filter((r) => r.status === "approved").length;
		const rejected = requests.filter((r) => r.status === "rejected").length;
		return { submitted, approved, rejected, total: requests.length };
	}, [requests]);

	if (isLoading) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<p className="text-text-subtle">Loading...</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
			{/* Header */}
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-text">
						IT Asset Requests
					</h1>
					<p className="text-sm text-text-subtle">
						Submit, track, and manage internal IT equipment and software requests.
					</p>
				</div>
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-2">
						<Lozenge variant="neutral" size="compact">
							{counts.submitted} pending
						</Lozenge>
						<Lozenge variant="success" size="compact">
							{counts.approved} approved
						</Lozenge>
						<Lozenge variant="danger" size="compact">
							{counts.rejected} rejected
						</Lozenge>
					</div>
					<Button variant="outline" size="sm" onClick={reset}>
						Reset Data
					</Button>
				</div>
			</div>

			{/* Tabs */}
			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList>
					<TabsTrigger value="request">New Request</TabsTrigger>
					<TabsTrigger value="my-requests" className="flex items-center gap-1.5">
						All Requests
						{counts.total > 0 ? (
							<Badge variant="neutral" className="ml-1">
								{counts.total}
							</Badge>
						) : null}
					</TabsTrigger>
					<TabsTrigger value="admin" className="flex items-center gap-1.5">
						Admin Review
						{counts.submitted > 0 ? (
							<Badge variant="info" className="ml-1">
								{counts.submitted}
							</Badge>
						) : null}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="request" className="mt-4">
					<AssetRequestForm
						onSubmit={(request) => {
							addRequest(request);
							setActiveTab("my-requests");
						}}
						className="max-w-2xl"
					/>
				</TabsContent>

				<TabsContent value="my-requests" className="mt-4">
					<AssetRequestList requests={requests} />
				</TabsContent>

				<TabsContent value="admin" className="mt-4">
					<AssetRequestAdmin
						requests={requests}
						onUpdateStatus={updateStatus}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
