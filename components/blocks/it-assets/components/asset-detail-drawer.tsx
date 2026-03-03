"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lozenge } from "@/components/ui/lozenge";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	ArrowRightLeftIcon,
	CalendarIcon,
	DollarSignIcon,
	EditIcon,
	MapPinIcon,
	PackageCheckIcon,
	ShieldCheckIcon,
	Trash2Icon,
	UserIcon,
} from "lucide-react";
import type { ITAsset, AssignmentRecord } from "@/lib/it-asset-types";
import {
	getITAssetStatusLabel,
	getITAssetStatusVariant,
	getAssignmentActionLabel,
	getAssignmentActionVariant,
	getValidNextStatuses,
	isSoftwareAsset,
} from "@/lib/it-asset-types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AssetDetailDrawerProps {
	asset: ITAsset | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onEdit: (asset: ITAsset) => void;
	onDelete: (id: string) => void;
	onCheckIn: (id: string) => void;
	onCheckOut: (id: string) => void;
	onChangeStatus: (id: string, status: string) => void;
}

// ---------------------------------------------------------------------------
// Info row helper
// ---------------------------------------------------------------------------

function InfoRow({
	label,
	value,
	icon: IconComponent,
}: {
	label: string;
	value: React.ReactNode;
	icon?: React.ComponentType<{ className?: string }>;
}) {
	if (!value) return null;
	return (
		<div className="flex items-start gap-3 py-1.5">
			{IconComponent ? (
				<IconComponent className="text-icon-subtle mt-0.5 size-4 shrink-0" />
			) : (
				<div className="size-4 shrink-0" />
			)}
			<div className="flex-1">
				<div className="text-text-subtle text-xs">{label}</div>
				<div className="text-sm">{value}</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Assignment history timeline
// ---------------------------------------------------------------------------

function AssignmentTimeline({
	records,
}: {
	records: AssignmentRecord[];
}) {
	if (records.length === 0) {
		return (
			<p className="text-muted-foreground py-4 text-center text-sm">
				No assignment history yet.
			</p>
		);
	}

	// Show most recent first
	const sorted = [...records].sort(
		(a, b) =>
			new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
	);

	return (
		<div className="relative space-y-0">
			{sorted.map((record, index) => (
				<div key={record.id} className="relative flex gap-3 pb-4">
					{/* Timeline line */}
					{index < sorted.length - 1 ? (
						<div className="bg-border absolute left-3 top-7 h-[calc(100%-16px)] w-px" />
					) : null}

					{/* Avatar */}
					<div className="relative z-10 shrink-0">
						{record.assigneeAvatar ? (
							<Image
								src={record.assigneeAvatar}
								alt={record.assigneeName}
								width={24}
								height={24}
								className="rounded-full"
							/>
						) : (
							<div className="bg-muted text-muted-foreground flex size-6 items-center justify-center rounded-full text-xs font-medium">
								{record.assigneeName
									.split(" ")
									.map((n) => n[0])
									.join("")
									.slice(0, 2)}
							</div>
						)}
					</div>

					{/* Content */}
					<div className="flex-1 space-y-1">
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-sm font-medium">
								{record.assigneeName}
							</span>
							<Lozenge
								variant={getAssignmentActionVariant(
									record.action,
								)}
							>
								{getAssignmentActionLabel(record.action)}
							</Lozenge>
						</div>
						<div className="text-muted-foreground text-xs">
							{record.department} ·{" "}
							{new Intl.DateTimeFormat(undefined, {
								dateStyle: "medium",
								timeStyle: "short",
							}).format(new Date(record.timestamp))}
						</div>
						{record.notes ? (
							<p className="text-muted-foreground text-xs">
								{record.notes}
							</p>
						) : null}
					</div>
				</div>
			))}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AssetDetailDrawer({
	asset,
	open,
	onOpenChange,
	onEdit,
	onDelete,
	onCheckIn,
	onCheckOut,
	onChangeStatus,
}: AssetDetailDrawerProps) {
	if (!asset) return null;

	const isSoftware = isSoftwareAsset(asset.type);
	const isAssigned = asset.status === "assigned";
	const canCheckOut =
		asset.status === "in-stock" || asset.status === "procurement";
	const nextStatuses = getValidNextStatuses(asset.status);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" size="md" className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle className="flex items-start gap-3">
						<span className="flex-1">{asset.name}</span>
						<Lozenge
							variant={getITAssetStatusVariant(asset.status)}
							size="spacious"
						>
							{getITAssetStatusLabel(asset.status)}
						</Lozenge>
					</SheetTitle>
					<SheetDescription>
						{asset.assetTag}
						{asset.serialNumber
							? ` · ${asset.serialNumber}`
							: null}
					</SheetDescription>
				</SheetHeader>

				<div className="flex flex-col gap-6 px-6 pb-6">
					{/* ── Asset information ──────────────────────────── */}
					<section>
						<h3 className="mb-3 text-sm font-semibold">
							Asset Information
						</h3>
						<div className="space-y-1">
							<InfoRow
								label="Type"
								value={
									<Badge
										variant="outline"
										className="text-xs"
									>
										{asset.type}
									</Badge>
								}
							/>
							<InfoRow
								label="Category"
								value={asset.category}
							/>
							{asset.manufacturer ? (
								<InfoRow
									label="Manufacturer"
									value={asset.manufacturer}
								/>
							) : null}
							{asset.model ? (
								<InfoRow
									label="Model"
									value={asset.model}
								/>
							) : null}
							{asset.location ? (
								<InfoRow
									label="Location"
									value={asset.location}
									icon={MapPinIcon}
								/>
							) : null}
						</div>
					</section>

					{/* ── Software details (conditional) ─────────────── */}
					{isSoftware ? (
						<>
							<Separator />
							<section>
								<h3 className="mb-3 text-sm font-semibold">
									License Details
								</h3>
								<div className="space-y-1">
									{asset.licenseKey ? (
										<InfoRow
											label="License Key"
											value={
												<code className="bg-muted rounded px-1.5 py-0.5 text-xs">
													{asset.licenseKey}
												</code>
											}
											icon={ShieldCheckIcon}
										/>
									) : null}
									{asset.licenseExpiry ? (
										<InfoRow
											label="License Expiry"
											value={new Intl.DateTimeFormat(
												undefined,
												{ dateStyle: "medium" },
											).format(
												new Date(asset.licenseExpiry),
											)}
											icon={CalendarIcon}
										/>
									) : null}
									{asset.seatCount != null ? (
										<InfoRow
											label="Seats"
											value={`${asset.seatCount} seats`}
										/>
									) : null}
								</div>
							</section>
						</>
					) : null}

					{/* ── Current assignment ──────────────────────────── */}
					<Separator />
					<section>
						<h3 className="mb-3 text-sm font-semibold">
							Current Assignment
						</h3>
						{isAssigned && asset.assigneeName ? (
							<div className="flex items-center gap-3">
								{asset.assigneeAvatar ? (
									<Image
										src={asset.assigneeAvatar}
										alt={asset.assigneeName}
										width={32}
										height={32}
										className="rounded-full"
									/>
								) : (
									<div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full text-sm font-medium">
										{asset.assigneeName
											.split(" ")
											.map((n) => n[0])
											.join("")
											.slice(0, 2)}
									</div>
								)}
								<div>
									<div className="text-sm font-medium">
										{asset.assigneeName}
									</div>
									<div className="text-muted-foreground text-xs">
										{asset.department ?? "—"}
									</div>
								</div>
							</div>
						) : (
							<p className="text-muted-foreground text-sm">
								Not currently assigned.
							</p>
						)}
					</section>

					{/* ── Financial ───────────────────────────────────── */}
					{(asset.purchaseDate ||
						asset.purchaseCost != null ||
						asset.warrantyExpiry) ? (
						<>
							<Separator />
							<section>
								<h3 className="mb-3 text-sm font-semibold">
									Financial
								</h3>
								<div className="space-y-1">
									{asset.purchaseDate ? (
										<InfoRow
											label="Purchase Date"
											value={new Intl.DateTimeFormat(
												undefined,
												{ dateStyle: "medium" },
											).format(
												new Date(asset.purchaseDate),
											)}
											icon={CalendarIcon}
										/>
									) : null}
									{asset.purchaseCost != null ? (
										<InfoRow
											label="Purchase Cost"
											value={`$${asset.purchaseCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
											icon={DollarSignIcon}
										/>
									) : null}
									{asset.warrantyExpiry ? (
										<InfoRow
											label="Warranty Expires"
											value={new Intl.DateTimeFormat(
												undefined,
												{ dateStyle: "medium" },
											).format(
												new Date(
													asset.warrantyExpiry,
												),
											)}
											icon={ShieldCheckIcon}
										/>
									) : null}
								</div>
							</section>
						</>
					) : null}

					{/* ── Notes ────────────────────────────────────────── */}
					{asset.notes ? (
						<>
							<Separator />
							<section>
								<h3 className="mb-3 text-sm font-semibold">
									Notes
								</h3>
								<p className="text-muted-foreground text-sm leading-relaxed">
									{asset.notes}
								</p>
							</section>
						</>
					) : null}

					{/* ── Assignment history ──────────────────────────── */}
					<Separator />
					<section>
						<h3 className="mb-3 text-sm font-semibold">
							Assignment History
						</h3>
						<AssignmentTimeline
							records={asset.assignmentHistory}
						/>
					</section>
				</div>

				{/* ── Action buttons ──────────────────────────────────── */}
				<SheetFooter className="flex-col gap-2 border-t px-6 py-4 sm:flex-col">
					{/* Check in / check out */}
					<div className="flex w-full gap-2">
						{isAssigned ? (
							<Button
								variant="outline"
								className="flex-1"
								onClick={() => onCheckIn(asset.id)}
							>
								<PackageCheckIcon data-icon="inline-start" />
								Check In
							</Button>
						) : null}
						{canCheckOut ? (
							<Button
								variant="default"
								className="flex-1"
								onClick={() => onCheckOut(asset.id)}
							>
								<UserIcon data-icon="inline-start" />
								Check Out
							</Button>
						) : null}
					</div>

					{/* Status transitions */}
					{nextStatuses.length > 0 ? (
						<div className="flex w-full flex-wrap gap-2">
							{nextStatuses.map((status) => (
								<Button
									key={status}
									variant="outline"
									size="sm"
									onClick={() =>
										onChangeStatus(asset.id, status)
									}
								>
									<ArrowRightLeftIcon data-icon="inline-start" />
									{getITAssetStatusLabel(status)}
								</Button>
							))}
						</div>
					) : null}

					<Separator className="my-1" />

					{/* Edit & delete */}
					<div className="flex w-full gap-2">
						<Button
							variant="outline"
							className="flex-1"
							onClick={() => onEdit(asset)}
						>
							<EditIcon data-icon="inline-start" />
							Edit
						</Button>
						<Button
							variant="destructive"
							size="icon"
							onClick={() => onDelete(asset.id)}
						>
							<Trash2Icon />
							<span className="sr-only">Delete</span>
						</Button>
					</div>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
