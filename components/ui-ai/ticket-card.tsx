"use client";

import type { ComponentProps } from "react";

import InboxIcon from "@atlaskit/icon/core/inbox";
import WarningIcon from "@atlaskit/icon/core/warning";

import { Badge } from "@/components/ui/badge";
import { Lozenge } from "@/components/ui/lozenge";
import {
	Progress,
	ProgressIndicator,
	ProgressTrack,
} from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type {
	ClassifiedTicket,
	ClassificationResult,
	TicketCategory,
	TicketPriority,
} from "@/lib/ticket-classifier-types";
import {
	CATEGORY_LABELS,
	CATEGORY_LOZENGE_VARIANT,
	CATEGORY_EMOJI,
	PRIORITY_LABELS,
	PRIORITY_BADGE_VARIANT,
	CONFIDENCE_THRESHOLDS,
	getConfidenceLabel,
	getConfidenceBadgeVariant,
} from "@/lib/ticket-classifier-types";

// ── Root ────────────────────────────────────────────────────────────────────

export type TicketCardProps = ComponentProps<"div"> & {
	result?: ClassificationResult;
};

export function TicketCard({ className, result, children, ...props }: TicketCardProps) {
	if (!result) return null;

	return (
		<div
			className={cn(
				"not-prose flex w-full flex-col gap-4 rounded-lg border border-border bg-surface p-4",
				className,
			)}
			{...props}
		>
			{children ? children : (
				<>
					<TicketCardHeader
						project={result.project}
						totalTickets={result.totalTickets}
						generatedAt={result.generatedAt}
						lowConfidenceCount={result.lowConfidenceCount}
					/>
					<TicketCardSummary
						distribution={result.distribution}
						priorityDistribution={result.priorityDistribution}
					/>
					{result.totalTickets === 0 ? (
						<TicketCardEmpty />
					) : (
						<div className="flex flex-col gap-3">
							{result.classified.map((item) => (
								<TicketCardItem key={item.ticket.key} item={item} />
							))}
						</div>
					)}
				</>
			)}
		</div>
	);
}

// ── Header ──────────────────────────────────────────────────────────────────

type TicketCardHeaderProps = {
	project: string;
	totalTickets: number;
	generatedAt: string;
	lowConfidenceCount: number;
};

function TicketCardHeader({
	project,
	totalTickets,
	generatedAt,
	lowConfidenceCount,
}: TicketCardHeaderProps) {
	const formattedDate = new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(generatedAt));

	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<InboxIcon label="" size="small" />
					<h3 className="text-sm font-semibold text-text">
						Ticket Classification
					</h3>
					<Badge variant="neutral">{totalTickets} tickets</Badge>
				</div>
				<span className="text-xs text-text-subtlest">{formattedDate}</span>
			</div>
			<div className="flex items-center gap-2">
				<span className="text-xs text-text-subtle">Project: {project}</span>
				{lowConfidenceCount > 0 ? (
					<span className="flex items-center gap-1 text-xs text-text-warning">
						<WarningIcon label="" size="small" />
						{lowConfidenceCount} low confidence
					</span>
				) : null}
			</div>
		</div>
	);
}

// ── Summary Row ─────────────────────────────────────────────────────────────

type TicketCardSummaryProps = {
	distribution: Record<TicketCategory, number>;
	priorityDistribution: Record<TicketPriority, number>;
};

function TicketCardSummary({
	distribution,
	priorityDistribution,
}: TicketCardSummaryProps) {
	const categoryEntries = Object.entries(distribution).filter(
		([, count]) => count > 0,
	) as [TicketCategory, number][];

	const priorityEntries = Object.entries(priorityDistribution).filter(
		([, count]) => count > 0,
	) as [TicketPriority, number][];

	return (
		<div className="flex flex-wrap gap-2">
			{categoryEntries.map(([category, count]) => (
				<Lozenge
					key={category}
					variant={CATEGORY_LOZENGE_VARIANT[category]}
					metric={count}
				>
					{CATEGORY_EMOJI[category]} {CATEGORY_LABELS[category]}
				</Lozenge>
			))}
			{priorityEntries.map(([priority, count]) => (
				<Badge key={priority} variant={PRIORITY_BADGE_VARIANT[priority]}>
					{priority}: {count}
				</Badge>
			))}
		</div>
	);
}

// ── Empty State ─────────────────────────────────────────────────────────────

function TicketCardEmpty() {
	return (
		<div className="flex flex-col items-center gap-1 py-6 text-center">
			<span className="text-sm font-medium text-text-subtle">
				No open tickets found
			</span>
			<span className="text-xs text-text-subtlest">
				All tickets in this project are resolved or closed.
			</span>
		</div>
	);
}

// ── Single Ticket Item ──────────────────────────────────────────────────────

type TicketCardItemProps = {
	item: ClassifiedTicket;
};

function TicketCardItem({ item }: TicketCardItemProps) {
	const { ticket, category, priority, confidence, suggestedTeam } = item;
	const isLowConfidence = confidence < CONFIDENCE_THRESHOLDS.low;
	const confidencePercent = Math.round(confidence * 100);
	const confidenceLabel = getConfidenceLabel(confidence);
	const confidenceVariant = getConfidenceBadgeVariant(confidence);

	const progressVariant =
		confidenceVariant === "success"
			? "success"
			: confidenceVariant === "warning"
				? "default"
				: "default";

	return (
		<a
			href={ticket.url}
			target="_blank"
			rel="noreferrer"
			className={cn(
				"flex flex-col gap-2 rounded-lg border p-3 transition-colors hover:bg-bg-neutral-hovered",
				isLowConfidence
					? "border-border-warning"
					: "border-border",
			)}
		>
			{/* Row 1: Key + Summary */}
			<div className="flex items-start gap-2">
				<span className="shrink-0 font-mono text-xs text-text-subtle">
					{ticket.key}
				</span>
				<span className="min-w-0 flex-1 text-sm font-medium text-text">
					{ticket.summary}
				</span>
			</div>

			{/* Row 2: Category + Priority + Status */}
			<div className="flex flex-wrap items-center gap-2">
				<Lozenge variant={CATEGORY_LOZENGE_VARIANT[category]} isBold>
					{CATEGORY_EMOJI[category]} {CATEGORY_LABELS[category]}
				</Lozenge>
				<Badge variant={PRIORITY_BADGE_VARIANT[priority]}>
					{priority} — {PRIORITY_LABELS[priority]}
				</Badge>
				<Lozenge variant="neutral">{ticket.status}</Lozenge>
			</div>

			{/* Row 3: Confidence + Suggested Team */}
			<div className="flex items-center gap-3">
				<div className="flex min-w-0 flex-1 items-center gap-2">
					<span className="shrink-0 text-xs text-text-subtle">Confidence</span>
					<div className="w-20">
						<Progress value={confidencePercent} variant={progressVariant}>
							<ProgressTrack>
								<ProgressIndicator />
							</ProgressTrack>
						</Progress>
					</div>
					<Badge variant={confidenceVariant} className="text-xs">
						{confidencePercent}% {confidenceLabel}
					</Badge>
					{isLowConfidence ? (
						<WarningIcon label="Low confidence" size="small" />
					) : null}
				</div>
				<div className="flex shrink-0 items-center gap-1 text-xs text-text-subtle">
					<span>{suggestedTeam.emoji}</span>
					<span>→ {suggestedTeam.team}</span>
				</div>
			</div>
		</a>
	);
}

export {
	TicketCardHeader,
	TicketCardSummary,
	TicketCardEmpty,
	TicketCardItem,
};
