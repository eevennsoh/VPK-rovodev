"use client";

import { useState, useCallback } from "react";
import type { AssetRequest, AssetRequestStatus } from "@/lib/asset-request-types";
import { getStatusLabel, getStatusVariant } from "@/lib/asset-request-types";
import { Button } from "@/components/ui/button";
import { Lozenge } from "@/components/ui/lozenge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AssetRequestAdminProps {
	requests: AssetRequest[];
	onUpdateStatus: (id: string, status: AssetRequestStatus, reviewNote?: string) => void;
	className?: string;
}

function formatDate(iso: string): string {
	return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
		new Date(iso),
	);
}

export function AssetRequestAdmin({
	requests,
	onUpdateStatus,
	className,
}: Readonly<AssetRequestAdminProps>) {
	const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
	const [expandedRow, setExpandedRow] = useState<string | null>(null);

	const handleNoteChange = useCallback((id: string, note: string) => {
		setReviewNotes((prev) => ({ ...prev, [id]: note }));
	}, []);

	const handleAction = useCallback(
		(id: string, status: AssetRequestStatus) => {
			onUpdateStatus(id, status, reviewNotes[id]?.trim() || undefined);
			setReviewNotes((prev) => {
				const next = { ...prev };
				delete next[id];
				return next;
			});
			setExpandedRow(null);
		},
		[onUpdateStatus, reviewNotes],
	);

	if (requests.length === 0) {
		return (
			<div className={cn("flex flex-col items-center justify-center py-16 text-text-subtle", className)}>
				<p className="text-lg font-medium">No requests to review</p>
				<p className="text-sm">All requests have been processed.</p>
			</div>
		);
	}

	return (
		<div className={cn("rounded-lg border border-border", className)}>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Requester</TableHead>
						<TableHead className="hidden sm:table-cell">Department</TableHead>
						<TableHead>Asset</TableHead>
						<TableHead className="hidden md:table-cell">Needed By</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{requests.map((request) => (
						<TableRow
							key={request.id}
							className="group"
						>
							<TableCell>
								<button
									type="button"
									className="text-left font-medium text-text hover:text-text-brand cursor-pointer bg-transparent border-0 p-0"
									onClick={() =>
										setExpandedRow(expandedRow === request.id ? null : request.id)
									}
								>
									{request.requesterName}
								</button>
								{expandedRow === request.id ? (
									<div className="mt-2 space-y-2">
										<p className="text-xs text-text-subtle sm:hidden">
											{request.department}
										</p>
										<p className="text-xs text-text-subtle md:hidden">
											Needed by {formatDate(request.neededByDate)}
										</p>
										<p className="text-sm text-text-subtle">
											{request.justification}
										</p>
										{request.status === "submitted" ? (
											<Textarea
												placeholder="Add a review note (optional)..."
												value={reviewNotes[request.id] ?? ""}
												onChange={(e) =>
													handleNoteChange(request.id, e.target.value)
												}
												rows={2}
												className="text-sm"
											/>
										) : null}
										{request.reviewNote ? (
											<div className="rounded-md bg-bg-neutral p-2 text-xs text-text-subtle">
												<span className="font-medium">Review note:</span>{" "}
												{request.reviewNote}
											</div>
										) : null}
									</div>
								) : null}
							</TableCell>
							<TableCell className="hidden sm:table-cell text-text-subtle">
								{request.department}
							</TableCell>
							<TableCell>{request.assetType}</TableCell>
							<TableCell className="hidden md:table-cell text-text-subtle">
								{formatDate(request.neededByDate)}
							</TableCell>
							<TableCell>
								<Lozenge
									variant={getStatusVariant(request.status)}
									isBold
									size="compact"
								>
									{getStatusLabel(request.status)}
								</Lozenge>
							</TableCell>
							<TableCell className="text-right">
								{request.status === "submitted" ? (
									<div className="flex items-center justify-end gap-2">
										<Button
											size="xs"
											variant="default"
											onClick={() => handleAction(request.id, "approved")}
										>
											Approve
										</Button>
										<Button
											size="xs"
											variant="destructive"
											onClick={() => handleAction(request.id, "rejected")}
										>
											Reject
										</Button>
									</div>
								) : (
									<span className="text-xs text-text-subtlest">
										{request.reviewedAt ? formatDate(request.reviewedAt) : "—"}
									</span>
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
