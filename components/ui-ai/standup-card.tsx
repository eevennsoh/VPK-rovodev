"use client";

import type { ComponentProps } from "react";

import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import TaskIcon from "@atlaskit/icon/core/task";

import { Badge } from "@/components/ui/badge";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Lozenge } from "@/components/ui/lozenge";
import { cn } from "@/lib/utils";
import type {
	StandupBucket,
	StandupItem,
	StandupMetrics,
	StandupSummary,
} from "@/lib/standup-types";
import {
	STANDUP_BUCKETS,
	STANDUP_BUCKET_LABELS,
	STANDUP_BUCKET_LOZENGE_VARIANT,
	STANDUP_BUCKET_EMOJI,
	getPriorityVariant,
} from "@/lib/standup-types";

// ── Root ────────────────────────────────────────────────────────────────────

export type StandupCardProps = ComponentProps<"div"> & {
	summary?: StandupSummary;
};

export function StandupCard({ className, summary, children, ...props }: StandupCardProps) {
	if (!summary) return null;

	return (
		<div
			className={cn(
				"not-prose flex w-full flex-col gap-3 rounded-lg border border-border bg-surface p-4",
				className,
			)}
			{...props}
		>
			{children ? children : (
				<>
					<StandupCardHeader
						timeWindowHours={summary.timeWindowHours}
						generatedAt={summary.generatedAt}
					/>
					<StandupCardMetrics metrics={summary.metrics} />
					{summary.metrics.total === 0 ? (
						<StandupCardEmpty />
					) : (
						STANDUP_BUCKETS.map((bucket) => (
							<StandupCardBucket
								key={bucket}
								bucket={bucket}
								items={summary.buckets[bucket]}
							/>
						))
					)}
				</>
			)}
		</div>
	);
}

// ── Header ──────────────────────────────────────────────────────────────────

type StandupCardHeaderProps = {
	timeWindowHours: number;
	generatedAt: string;
};

function StandupCardHeader({ timeWindowHours, generatedAt }: StandupCardHeaderProps) {
	const formattedDate = new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(generatedAt));

	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-2">
				<TaskIcon label="" size="small" />
				<h3 className="text-sm font-semibold text-text">Daily Standup</h3>
			</div>
			<span className="text-xs text-text-subtlest">
				Last {timeWindowHours}h · {formattedDate}
			</span>
		</div>
	);
}

// ── Metrics Row ─────────────────────────────────────────────────────────────

type StandupCardMetricsProps = {
	metrics: StandupMetrics;
};

function StandupCardMetrics({ metrics }: StandupCardMetricsProps) {
	return (
		<div className="grid grid-cols-4 gap-2">
			<MetricTile label="Total" value={metrics.total} variant="neutral" />
			<MetricTile label="Done" value={metrics.done} variant="success" />
			<MetricTile label="In Progress" value={metrics.doing} variant="information" />
			<MetricTile label="Blockers" value={metrics.blockers} variant="danger" />
		</div>
	);
}

type MetricTileProps = {
	label: string;
	value: number;
	variant: "neutral" | "success" | "information" | "danger";
};

const metricBgMap: Record<MetricTileProps["variant"], string> = {
	neutral: "bg-bg-neutral",
	success: "bg-bg-success",
	information: "bg-bg-information",
	danger: "bg-bg-danger",
};

function MetricTile({ label, value, variant }: MetricTileProps) {
	return (
		<div
			className={cn(
				"flex flex-col items-center rounded-md px-2 py-1.5",
				metricBgMap[variant],
			)}
		>
			<span className="text-lg font-bold text-text">{value}</span>
			<span className="text-xs text-text-subtle">{label}</span>
		</div>
	);
}

// ── Empty State ─────────────────────────────────────────────────────────────

function StandupCardEmpty() {
	return (
		<div className="flex flex-col items-center gap-1 py-6 text-center">
			<span className="text-sm font-medium text-text-subtle">No activity found</span>
			<span className="text-xs text-text-subtlest">
				No work items were updated in this time window.
			</span>
		</div>
	);
}

// ── Bucket Section ──────────────────────────────────────────────────────────

type StandupCardBucketProps = {
	bucket: StandupBucket;
	items: StandupItem[];
};

function StandupCardBucket({ bucket, items }: StandupCardBucketProps) {
	if (items.length === 0) return null;

	return (
		<Collapsible defaultOpen={bucket === "blockers" || items.length <= 5}>
			<CollapsibleTrigger
				className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-text hover:bg-bg-neutral-hovered"
			>
				<span>{STANDUP_BUCKET_EMOJI[bucket]}</span>
				<span>{STANDUP_BUCKET_LABELS[bucket]}</span>
				<Lozenge variant={STANDUP_BUCKET_LOZENGE_VARIANT[bucket]} size="compact">
					{items.length}
				</Lozenge>
				<span className="ml-auto transition-transform duration-200 group-data-[state=open]:rotate-180">
					<ChevronDownIcon label="" size="small" />
				</span>
			</CollapsibleTrigger>
			<CollapsibleContent className="space-y-1 pt-1">
				{items.map((item) => (
					<StandupCardItem key={item.key} item={item} />
				))}
			</CollapsibleContent>
		</Collapsible>
	);
}

// ── Single Work Item Row ────────────────────────────────────────────────────

type StandupCardItemProps = {
	item: StandupItem;
};

function StandupCardItem({ item }: StandupCardItemProps) {
	return (
		<a
			href={item.url}
			target="_blank"
			rel="noreferrer"
			className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-bg-neutral-hovered"
		>
			<span className="shrink-0 font-mono text-text-subtle">{item.key}</span>
			<span className="min-w-0 flex-1 truncate text-text">{item.summary}</span>
			<Lozenge
				variant={STANDUP_BUCKET_LOZENGE_VARIANT[item.bucket]}
				size="compact"
			>
				{item.status}
			</Lozenge>
			<Badge variant={getPriorityVariant(item.priority)}>
				{item.priority}
			</Badge>
		</a>
	);
}

export {
	StandupCardHeader,
	StandupCardMetrics,
	StandupCardEmpty,
	StandupCardBucket,
	StandupCardItem,
};
