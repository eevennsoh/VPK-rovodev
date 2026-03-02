"use client";

import type { AssetRequest } from "@/lib/asset-request-types";
import { getStatusLabel, getStatusVariant } from "@/lib/asset-request-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lozenge } from "@/components/ui/lozenge";
import { cn } from "@/lib/utils";

interface AssetRequestListProps {
	requests: AssetRequest[];
	className?: string;
}

function formatDate(iso: string): string {
	return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
		new Date(iso),
	);
}

export function AssetRequestList({ requests, className }: Readonly<AssetRequestListProps>) {
	if (requests.length === 0) {
		return (
			<div className={cn("flex flex-col items-center justify-center py-16 text-text-subtle", className)}>
				<p className="text-lg font-medium">No requests yet</p>
				<p className="text-sm">Submit a new asset request to get started.</p>
			</div>
		);
	}

	return (
		<div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
			{requests.map((request) => (
				<Card key={request.id} className="flex flex-col">
					<CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
						<CardTitle className="text-sm font-medium leading-snug">
							{request.assetType}
						</CardTitle>
						<Lozenge
							variant={getStatusVariant(request.status)}
							isBold
							size="compact"
						>
							{getStatusLabel(request.status)}
						</Lozenge>
					</CardHeader>
					<CardContent className="flex flex-1 flex-col gap-2 text-sm">
						<div className="flex items-center gap-2 text-text-subtle">
							<span className="font-medium text-text">{request.requesterName}</span>
							<span>·</span>
							<span>{request.department}</span>
						</div>
						<p className="line-clamp-2 text-text-subtle">{request.justification}</p>
						<div className="mt-auto flex items-center justify-between pt-2 text-xs text-text-subtlest">
							<span>Needed by {formatDate(request.neededByDate)}</span>
							<span>Submitted {formatDate(request.submittedAt)}</span>
						</div>
						{request.reviewNote ? (
							<div className="mt-1 rounded-md bg-bg-neutral p-2 text-xs text-text-subtle">
								<span className="font-medium">Review note:</span> {request.reviewNote}
							</div>
						) : null}
					</CardContent>
				</Card>
			))}
		</div>
	);
}
