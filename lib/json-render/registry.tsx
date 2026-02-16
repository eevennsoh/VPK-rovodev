"use client";

import NextImage from "next/image";
import { Fragment, Suspense, lazy, useState } from "react";
import { defineRegistry, useBoundProp } from "@json-render/react";
import { getByPath, setByPath } from "@json-render/core";
import { catalog } from "./catalog";

/** Convert null to undefined for React component props that expect optional values */
function nu<T>(v: T | null | undefined): T | undefined {
	return v ?? undefined;
}

function isDynamicExpressionObject(value: unknown): boolean {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}

	const record = value as Record<string, unknown>;
	return (
		Object.prototype.hasOwnProperty.call(record, "$state") ||
		Object.prototype.hasOwnProperty.call(record, "$item") ||
		Object.prototype.hasOwnProperty.call(record, "$index") ||
		Object.prototype.hasOwnProperty.call(record, "$bindState") ||
		Object.prototype.hasOwnProperty.call(record, "$bindItem") ||
		Object.prototype.hasOwnProperty.call(record, "$cond")
	);
}

function toSafeText(value: unknown): string {
	if (value === null || value === undefined) {
		return "";
	}

	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean" ||
		typeof value === "bigint"
	) {
		return String(value);
	}

	if (Array.isArray(value)) {
		return value.map((entry) => toSafeText(entry)).filter(Boolean).join(", ");
	}

	if (isDynamicExpressionObject(value)) {
		return "";
	}

	try {
		return JSON.stringify(value);
	} catch {
		return "";
	}
}

function toSafeOptionalText(value: unknown): string | undefined {
	const text = toSafeText(value).trim();
	return text.length > 0 ? text : undefined;
}

function cloneStateModel<TState extends Record<string, unknown>>(state: TState): TState {
	if (typeof structuredClone === "function") {
		return structuredClone(state);
	}

	return JSON.parse(JSON.stringify(state)) as TState;
}

// ── VPK UI primitives ──────────────────────────────────────────
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import type { BundledLanguage } from "shiki";

// ── New VPK UI primitives ─────────────────────────────────────
import { Checkbox as CheckboxPrimitive } from "@/components/ui/checkbox";
import { Switch as SwitchPrimitive } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Slider as SliderPrimitive } from "@/components/ui/slider";
import { Toggle as TogglePrimitive } from "@/components/ui/toggle";
import { ToggleGroup as ToggleGroupPrimitive, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Avatar as AvatarRoot, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Lozenge } from "@/components/ui/lozenge";
import { Tag as TagPrimitive, TagGroup } from "@/components/ui/tag";
import { Spinner } from "@/components/ui/spinner";
import { CodeBlock as AiCodeBlock } from "@/components/ui-ai/code-block";
import { Kbd } from "@/components/ui/kbd";
import { Comment } from "@/components/ui/comment";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { ObjectTile } from "@/components/ui/object-tile";
import { IconTile } from "@/components/ui/icon-tile";
import { Breadcrumb as BreadcrumbRoot, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonGroup as ButtonGroupPrimitive } from "@/components/ui/button-group";
import { ProgressBar, ProgressBarLabel } from "@/components/ui/progress-bar";
import { ProgressTracker } from "@/components/ui/progress-tracker";

// ── Lucide icons ──────────────────────────────────────────────
import { TrendingUp, TrendingDown, Minus, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

// ── Recharts ───────────────────────────────────────────────────
import {
	BarChart as RechartsBarChart,
	Bar,
	LineChart as RechartsLineChart,
	Line,
	PieChart as RechartsPieChart,
	Pie,
	Cell,
	XAxis,
	YAxis,
	CartesianGrid,
	AreaChart as RechartsAreaChart,
	Area,
	RadarChart as RechartsRadarChart,
	Radar,
	PolarGrid,
	PolarAngleAxis,
	PolarRadiusAxis,
} from "recharts";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";

// ── 3D (lazy-loaded) ──────────────────────────────────────────
const Scene3DImpl = lazy(() => import("./scene-3d"));

// ── Chart helpers ─────────────────────────────────────────────
const PIE_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

function toDataArray(raw: unknown): Array<Record<string, unknown>> {
	if (Array.isArray(raw)) return raw;
	if (raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).data)) {
		return (raw as Record<string, unknown>).data as Array<Record<string, unknown>>;
	}
	return [];
}

function processChartData(
	items: Array<Record<string, unknown>>,
	xKey: string,
	yKey: string,
	aggregate: "sum" | "count" | "avg" | null | undefined,
): { items: Array<Record<string, unknown>>; valueKey: string } {
	if (items.length === 0) {
		return { items: [], valueKey: yKey };
	}
	if (!aggregate) {
		const formatted = items.map((item) => ({ ...item, label: String(item[xKey] ?? "") }));
		return { items: formatted, valueKey: yKey };
	}
	const groups = new Map<string, Array<Record<string, unknown>>>();
	for (const item of items) {
		const groupKey = String(item[xKey] ?? "unknown");
		const group = groups.get(groupKey) ?? [];
		group.push(item);
		groups.set(groupKey, group);
	}
	const valueKey = aggregate === "count" ? "count" : yKey;
	const aggregated: Array<Record<string, unknown>> = [];
	const sortedKeys = Array.from(groups.keys()).sort();
	for (const key of sortedKeys) {
		const group = groups.get(key)!;
		let value: number;
		if (aggregate === "count") {
			value = group.length;
		} else if (aggregate === "sum") {
			value = group.reduce((sum, item) => {
				const v = item[yKey];
				return sum + (typeof v === "number" ? v : parseFloat(String(v)) || 0);
			}, 0);
		} else {
			const sum = group.reduce((s, item) => {
				const v = item[yKey];
				return s + (typeof v === "number" ? v : parseFloat(String(v)) || 0);
			}, 0);
			value = group.length > 0 ? sum / group.length : 0;
		}
		aggregated.push({ label: key, [valueKey]: value });
	}
	return { items: aggregated, valueKey };
}

// ── Gap class mapping ─────────────────────────────────────────
const GAP_CLASSES: Record<string, string> = {
	sm: "gap-2",
	md: "gap-4",
	lg: "gap-6",
};

// ── Grid column class mapping ─────────────────────────────────
const GRID_COL_CLASSES: Record<string, string> = {
	"1": "grid-cols-1",
	"2": "grid-cols-1 md:grid-cols-2",
	"3": "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
	"4": "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
};

function normalizeHeadingLevel(rawLevel: unknown): "h1" | "h2" | "h3" | "h4" {
	if (typeof rawLevel === "string") {
		const trimmed = rawLevel.trim().toLowerCase();
		if (trimmed === "h1" || trimmed === "h2" || trimmed === "h3" || trimmed === "h4") {
			return trimmed;
		}
		if (trimmed === "1" || trimmed === "2" || trimmed === "3" || trimmed === "4") {
			return `h${trimmed}` as "h1" | "h2" | "h3" | "h4";
		}
	}

	if (typeof rawLevel === "number" && Number.isInteger(rawLevel) && rawLevel >= 1 && rawLevel <= 4) {
		return `h${rawLevel}` as "h1" | "h2" | "h3" | "h4";
	}

	return "h2";
}

// ── Registry ───────────────────────────────────────────────────

export const { registry, handlers } = defineRegistry(catalog, {
	components: {
		// ── Layout ──────────────────────────────────────
		Stack: ({ props, children }) => {
			const { direction = "vertical", gap = "md", align, justify, padding, className } = props;
			return (
				<div
					className={cn(
						"flex",
						direction === "horizontal" ? "flex-row" : "flex-col",
						GAP_CLASSES[gap ?? "md"],
						align === "center" && "items-center",
						align === "start" && "items-start",
						align === "end" && "items-end",
						align === "stretch" && "items-stretch",
						justify === "center" && "justify-center",
						justify === "start" && "justify-start",
						justify === "end" && "justify-end",
						justify === "between" && "justify-between",
						className,
					)}
					style={{ padding: padding ? `${padding * 4}px` : undefined }}
				>
					{children}
				</div>
			);
		},

		Card: ({ props, children }) => {
			const { className } = props;
			const title = toSafeOptionalText(props.title);
			const description = toSafeOptionalText(props.description);
			return (
				<Card className={className ?? undefined}>
					{(title || description) ? (
						<CardHeader>
							{title ? <CardTitle>{title}</CardTitle> : null}
							{description ? <CardDescription>{description}</CardDescription> : null}
						</CardHeader>
					) : null}
					<CardContent>{children}</CardContent>
				</Card>
			);
		},

		Grid: ({ props, children }) => {
			const { columns = "2", gap = "md", className } = props;
			return (
				<div
					className={cn(
						"grid",
						GRID_COL_CLASSES[columns ?? "2"],
						GAP_CLASSES[gap ?? "md"],
						className,
					)}
				>
					{children}
				</div>
			);
		},

		// ── Typography ─────────────────────────────────
		Heading: ({ props }) => {
			const { level, className } = props;
			const text = toSafeText(props.text);
			const normalizedLevel = normalizeHeadingLevel(level);
			const Tag = normalizedLevel;
			const sizes: Record<string, string> = {
				h1: "text-3xl font-bold",
				h2: "text-2xl font-semibold",
				h3: "text-xl font-semibold",
				h4: "text-lg font-medium",
			};
			return <Tag className={cn(sizes[normalizedLevel], "text-text", className)}>{text}</Tag>;
		},

		Text: ({ props }) => {
			const { muted } = props;
			const content = toSafeText(props.content);
			return <p className={cn("text-sm", muted ? "text-text-subtlest" : "text-text-subtle")}>{content}</p>;
		},

		// ── Data Display ───────────────────────────────
		Badge: ({ props }) => {
			const { variant = "default" } = props;
			const text = toSafeText(props.text);
			return <Badge variant={variant}>{text}</Badge>;
		},

		Alert: ({ props }) => {
			const { variant = "default" } = props;
			const title = toSafeOptionalText(props.title);
			const description = toSafeText(props.description);
			return (
				<Alert variant={variant}>
					{title ? <AlertTitle>{title}</AlertTitle> : null}
					<AlertDescription>{description}</AlertDescription>
				</Alert>
			);
		},

		Separator: ({ props }) => {
			const { orientation = "horizontal" } = props;
			return <Separator orientation={orientation ?? undefined} />;
		},

		Metric: ({ props }) => {
			const { trend } = props;
			const label = toSafeText(props.label);
			const value = toSafeText(props.value);
			const detail = toSafeOptionalText(props.detail);
			const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
			return (
				<div className="rounded-lg border border-border bg-surface p-4">
					<p className="text-xs text-text-subtlest">{label}</p>
					<div className="mt-1 flex items-center gap-2">
						<p className="text-2xl font-semibold text-text">{value}</p>
						{trend ? (
							<TrendIcon
								className={cn(
									"size-4",
									trend === "up" && "text-text-success",
									trend === "down" && "text-text-danger",
									trend === "neutral" && "text-text-subtle",
								)}
							/>
						) : null}
					</div>
					{detail ? (
						<p
							className={cn(
								"mt-1 text-xs",
								trend === "up" && "text-text-success",
								trend === "down" && "text-text-danger",
								(!trend || trend === "neutral") && "text-text-subtle",
							)}
						>
							{detail}
						</p>
					) : null}
				</div>
			);
		},

		Table: ({ props }) => {
			const { columns, emptyMessage } = props;
			const data = toDataArray(props.data);
			const [sortKey, setSortKey] = useState<string | null>(null);
			const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

			const handleSort = (key: string) => {
				if (sortKey === key) {
					setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
				} else {
					setSortKey(key);
					setSortDir("asc");
				}
			};

			const sortedData = sortKey
				? [...data].sort((a, b) => {
						const aVal = a[sortKey];
						const bVal = b[sortKey];
						const aStr = String(aVal ?? "");
						const bStr = String(bVal ?? "");
						const aNum = Number(aVal);
						const bNum = Number(bVal);
						if (!isNaN(aNum) && !isNaN(bNum)) {
							return sortDir === "asc" ? aNum - bNum : bNum - aNum;
						}
						return sortDir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
					})
				: data;

			if (!Array.isArray(data) || data.length === 0) {
				return (
					<div className="rounded-lg border border-border p-6 text-center text-sm text-text-subtle">
						{emptyMessage ?? "No data available."}
					</div>
				);
			}

			return (
				<Table>
						<TableHeader>
							<TableRow>
								{columns.map((col: { key: string; label: string }) => (
									<TableHead
										key={col.key}
										className="cursor-pointer select-none"
										onClick={() => handleSort(col.key)}
									>
										<div className="flex items-center gap-1">
											{toSafeText(col.label)}
											{sortKey === col.key ? (
												sortDir === "asc" ? (
													<ArrowUp className="size-3" />
											) : (
												<ArrowDown className="size-3" />
											)
										) : (
											<ArrowUpDown className="size-3 opacity-40" />
										)}
									</div>
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{sortedData.map((row, i: number) => (
							<TableRow key={i}>
								{columns.map((col: { key: string; label: string }) => (
									<TableCell key={col.key}>{String(row[col.key] ?? "")}</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			);
		},

		Link: ({ props }) => {
			const text = toSafeText(props.text);
			const href = toSafeOptionalText(props.href);
			if (!href) {
				return null;
			}

			return (
				<a href={href} className="text-sm text-link hover:underline" target="_blank" rel="noopener noreferrer">
					{text}
				</a>
			);
		},

		// ── Charts ─────────────────────────────────────
		BarChart: ({ props }) => {
			const { xKey, yKey, aggregate, color, height } = props;
			const title = toSafeOptionalText(props.title);
			const rawData = toDataArray(props.data);
			const { items, valueKey } = processChartData(rawData, xKey, yKey, aggregate);
			const fillColor = color ?? "var(--color-chart-1)";
			const config: ChartConfig = { [valueKey]: { label: valueKey, color: fillColor } };
			return (
				<div>
					{title ? <p className="mb-2 text-sm font-medium text-text">{title}</p> : null}
					<ChartContainer config={config} className="min-h-[200px] w-full" style={height ? { height } : undefined}>
						<RechartsBarChart data={items}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey={aggregate ? "label" : xKey} tick={{ fontSize: 12 }} />
							<YAxis tick={{ fontSize: 12 }} />
							<ChartTooltip content={<ChartTooltipContent />} />
							<Bar dataKey={valueKey} fill={fillColor} radius={[4, 4, 0, 0]} />
						</RechartsBarChart>
					</ChartContainer>
				</div>
			);
		},

		LineChart: ({ props }) => {
			const { xKey, yKey, aggregate, color, height } = props;
			const title = toSafeOptionalText(props.title);
			const rawData = toDataArray(props.data);
			const { items, valueKey } = processChartData(rawData, xKey, yKey, aggregate);
			const strokeColor = color ?? "var(--color-chart-1)";
			const config: ChartConfig = { [valueKey]: { label: valueKey, color: strokeColor } };
			return (
				<div>
					{title ? <p className="mb-2 text-sm font-medium text-text">{title}</p> : null}
					<ChartContainer config={config} className="min-h-[200px] w-full" style={height ? { height } : undefined}>
						<RechartsLineChart data={items}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey={aggregate ? "label" : xKey} tick={{ fontSize: 12 }} />
							<YAxis tick={{ fontSize: 12 }} />
							<ChartTooltip content={<ChartTooltipContent />} />
							<Line type="monotone" dataKey={valueKey} stroke={strokeColor} strokeWidth={2} dot={false} />
						</RechartsLineChart>
					</ChartContainer>
				</div>
			);
		},

		PieChart: ({ props }) => {
			const { nameKey, valueKey, height } = props;
			const title = toSafeOptionalText(props.title);
			const rawData = toDataArray(props.data);
			const config: ChartConfig = {};
			for (let i = 0; i < rawData.length; i++) {
				const name = String(rawData[i][nameKey] ?? `item-${i}`);
				config[name] = { label: name, color: PIE_COLORS[i % PIE_COLORS.length] };
			}
			return (
				<div>
					{title ? <p className="mb-2 text-sm font-medium text-text">{title}</p> : null}
					<ChartContainer config={config} className="min-h-[200px] w-full" style={height ? { height } : undefined}>
						<RechartsPieChart>
							<ChartTooltip content={<ChartTooltipContent />} />
							<Pie data={rawData} nameKey={nameKey} dataKey={valueKey} cx="50%" cy="50%" outerRadius={80} label>
								{rawData.map((entry, i: number) => (
									<Cell key={String(entry[nameKey] ?? i)} fill={PIE_COLORS[i % PIE_COLORS.length]} />
								))}
							</Pie>
						</RechartsPieChart>
					</ChartContainer>
				</div>
			);
		},

		// ── Interactive ────────────────────────────────
		Tabs: ({ props, children }) => {
			const { tabs, defaultValue } = props;
			return (
				<Tabs defaultValue={toSafeOptionalText(defaultValue) || toSafeOptionalText(tabs[0]?.value)}>
					<TabsList>
						{tabs.map((tab: { value: string; label: string }) => (
							<TabsTrigger key={toSafeText(tab.value)} value={toSafeText(tab.value)}>
								{toSafeText(tab.label)}
							</TabsTrigger>
						))}
					</TabsList>
					{children}
				</Tabs>
			);
		},

		TabContent: ({ props, children }) => {
			const { value } = props;
			return <TabsContent value={value}>{children}</TabsContent>;
		},

		Progress: ({ props }) => {
			const { value, max = 100, label } = props;
			const maxVal = max ?? 100;
			const percentage = maxVal > 0 ? (value / maxVal) * 100 : 0;
			return (
				<div className="space-y-1">
					{label ? <p className="text-sm text-text-subtle">{toSafeText(label)}</p> : null}
					<Progress value={percentage} />
				</div>
			);
		},

		Skeleton: ({ props }) => {
			const { width, height, className } = props;
			return <Skeleton className={className ?? undefined} style={{ width: width ?? undefined, height: height ?? undefined }} />;
		},

		Callout: ({ props }) => {
			const { type = "info" } = props;
			const title = toSafeOptionalText(props.title);
			const content = toSafeText(props.content);
			const icon = toSafeOptionalText(props.icon);
			const colorMap: Record<string, string> = {
				info: "border-border-information bg-bg-information",
				warning: "border-border-warning bg-bg-warning",
				success: "border-border-success bg-bg-success",
				error: "border-border-danger bg-bg-danger",
			};
			const iconMap: Record<string, string> = {
				info: "\u2139\uFE0F",
				warning: "\u26A0\uFE0F",
				success: "\u2705",
				error: "\u274C",
			};
			return (
				<div className={cn("rounded-lg border p-4", colorMap[type ?? "info"] || colorMap.info)}>
					<div className="flex gap-2">
						{icon ? <span className="shrink-0">{icon}</span> : ((type ?? "info") in iconMap ? <span className="shrink-0">{iconMap[type ?? "info"]}</span> : null)}
						<div>
							{title ? <p className="text-sm font-medium text-text">{title}</p> : null}
							<p className="text-sm text-text-subtle">{content}</p>
						</div>
					</div>
				</div>
			);
		},

		Accordion: ({ props }) => {
			const { items } = props;
			return (
				<Accordion>
					{items.map((item: { title: string; content: string }, i: number) => (
						<AccordionItem key={i} value={`item-${i}`}>
							<AccordionTrigger>{toSafeText(item.title)}</AccordionTrigger>
							<AccordionContent>{toSafeText(item.content)}</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			);
		},

		Timeline: ({ props }) => {
			const { items } = props;
			return (
				<div className="space-y-4">
					{items.map((item, i) => {
						const dotColor =
							item.status === "completed"
								? "bg-bg-success-bold"
								: item.status === "current"
									? "bg-bg-brand-bold"
									: "bg-bg-neutral";
						return (
							<div key={i} className="flex gap-3">
								<div className="flex flex-col items-center">
									<div className={cn("size-3 rounded-full mt-1 shrink-0", dotColor)} />
									{i < items.length - 1 ? <div className="w-px flex-1 bg-border" /> : null}
								</div>
								<div className="pb-4">
									<p className="text-sm font-medium text-text">{toSafeText(item.title)}</p>
									{item.description ? <p className="text-xs text-text-subtle">{toSafeText(item.description)}</p> : null}
									{item.date ? <p className="text-xs text-text-subtlest mt-0.5">{toSafeText(item.date)}</p> : null}
								</div>
							</div>
						);
					})}
				</div>
			);
		},

		RadioGroup: ({ props, bindings }) => {
			const { options, label } = props;
			const [value, setValue] = useBoundProp<string>(props.value ?? undefined, bindings?.value);
			return (
				<div className="space-y-2">
					{label ? <Label>{toSafeText(label)}</Label> : null}
					<RadioGroup value={value ?? ""} onValueChange={setValue}>
						{options.map((opt) => (
							<div key={toSafeText(opt.value)} className="flex items-center gap-2">
								<RadioGroupItem value={toSafeText(opt.value)} />
								<Label className="font-normal">{toSafeText(opt.label)}</Label>
							</div>
						))}
					</RadioGroup>
				</div>
			);
		},

		SelectInput: ({ props, bindings }) => {
			const { options, placeholder, label } = props;
			const [value, setValue] = useBoundProp<string>(props.value ?? undefined, bindings?.value);
			return (
				<div className="space-y-2">
					{label ? <Label>{toSafeText(label)}</Label> : null}
					<Select value={value ?? ""} onValueChange={(v) => { if (v !== null) setValue(v); }}>
						<SelectTrigger>
							<SelectValue placeholder={toSafeOptionalText(placeholder) ?? "Select..."} />
						</SelectTrigger>
						<SelectContent>
							{options.map((opt) => (
								<SelectItem key={toSafeText(opt.value)} value={toSafeText(opt.value)}>
									{toSafeText(opt.label)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			);
		},

		TextInput: ({ props, bindings }) => {
			const { placeholder, label, type = "text" } = props;
			const [value, setValue] = useBoundProp<string>(props.value ?? undefined, bindings?.value);
			return (
				<div className="space-y-2">
					{label ? <Label>{toSafeText(label)}</Label> : null}
					<Input
						type={nu(type)}
						placeholder={toSafeOptionalText(placeholder)}
						value={value ?? ""}
						onChange={(e) => setValue(e.target.value)}
					/>
				</div>
			);
		},

		Button: ({ props, emit }) => {
			const { label, variant = "default", size = "default", disabled } = props;
			return (
				<Button variant={variant} size={size} disabled={disabled ?? false} onClick={() => emit("press")}>
					{toSafeText(label)}
				</Button>
			);
		},

		// ── Data Display (extended) ───────────────────
		Avatar: ({ props }) => {
			const { src, fallback, size = "default", shape = "circle" } = props;
			const safeFallback = toSafeText(fallback);
			const initials = safeFallback
				.split(" ")
				.filter(Boolean)
				.slice(0, 2)
				.map((w) => w[0]?.toUpperCase())
				.join("") || "?";
			return (
				<AvatarRoot size={size} shape={shape}>
					{src ? <AvatarImage src={src} alt={safeFallback} /> : null}
					<AvatarFallback>{initials}</AvatarFallback>
				</AvatarRoot>
			);
		},

		Lozenge: ({ props }) => {
			const { text, variant = "neutral", isBold = false } = props;
			return <Lozenge variant={variant} isBold={isBold}>{toSafeText(text)}</Lozenge>;
		},

		Tag: ({ props }) => {
			const { text, variant = "default", color } = props;
			return <TagPrimitive variant={nu(variant)} color={nu(color)}>{toSafeText(text)}</TagPrimitive>;
		},

		TagGroup: ({ children }) => {
			return <TagGroup>{children}</TagGroup>;
		},

		Spinner: ({ props }) => {
			const { size = "default", label } = props;
			return <Spinner size={size} label={toSafeOptionalText(label)} />;
		},

		Code: ({ props }) => {
			return <code className="bg-bg-neutral text-text rounded-sm border border-border px-1.5 py-0.5 text-[0.8125rem]">{toSafeText(props.text)}</code>;
		},

		CodeBlock: ({ props }) => {
			return (
				<AiCodeBlock
					code={toSafeText(props.code)}
					language={(toSafeOptionalText(props.language) ?? "text") as BundledLanguage}
				/>
			);
		},

		Kbd: ({ props }) => {
			return <Kbd>{toSafeText(props.text)}</Kbd>;
		},

		Image: ({ props }) => {
			const { src, alt, width, height } = props;
			return <NextImage src={src} alt={toSafeText(alt)} width={width} height={height} className="rounded-md" />;
		},

		Comment: ({ props }) => {
			const { author, avatarSrc, time, content } = props;
			return (
				<Comment author={toSafeText(author)} avatarSrc={nu(avatarSrc)} time={toSafeOptionalText(time)}>
					{toSafeText(content)}
				</Comment>
			);
		},

		SectionMessage: ({ props }) => {
			const { title, description, appearance = "info" } = props;
			return (
				<Alert variant={appearance}>
					{title ? <AlertTitle>{toSafeText(title)}</AlertTitle> : null}
					{description ? <AlertDescription>{toSafeText(description)}</AlertDescription> : null}
				</Alert>
			);
		},

		EmptyState: ({ props }) => {
			const { title, description } = props;
			return (
				<Empty>
					<EmptyHeader>
						<EmptyTitle>{toSafeText(title)}</EmptyTitle>
						{description ? <EmptyDescription>{toSafeText(description)}</EmptyDescription> : null}
					</EmptyHeader>
				</Empty>
			);
		},

		ObjectTile: ({ props }) => {
			const { title, description, href } = props;
			return <ObjectTile title={toSafeText(title)} description={toSafeOptionalText(description)} href={toSafeOptionalText(href)} />;
		},

		IconTile: ({ props }) => {
			const { label, variant = "gray", size = "medium" } = props;
			return <IconTile icon={null} label={toSafeText(label)} variant={nu(variant)} size={nu(size)} />;
		},
		MapWidget: ({ props, bindings }) => {
			const markerEntries = Array.isArray(props.markers)
				? props.markers.filter(
						(marker) =>
							typeof marker.id === "string" &&
							Number.isFinite(marker.lat) &&
							Number.isFinite(marker.lng) &&
							typeof marker.title === "string",
					)
				: [];

			const [selectedMarkerId, setSelectedMarkerId] = useBoundProp<string>(
				nu(props.selectedMarkerId),
				bindings?.selectedMarkerId,
			);
			const activeMarkerId = selectedMarkerId ?? props.selectedMarkerId ?? markerEntries[0]?.id ?? "";
			const activeMarker =
				markerEntries.find((marker: { id: string }) => marker.id === activeMarkerId) ??
				null;
			const fallbackCenter = markerEntries[0]
				? { lat: markerEntries[0].lat, lng: markerEntries[0].lng }
				: { lat: 39.5, lng: -98.35 };
			const center =
				Number.isFinite(props.center?.lat) && Number.isFinite(props.center?.lng)
					? props.center
					: fallbackCenter;
			const zoom = Number.isFinite(props.zoom) ? props.zoom! : 4;
			const height = Number.isFinite(props.height) ? props.height! : 320;

			return (
				<div className="space-y-3">
					<div
						className="overflow-hidden rounded-lg border border-border"
						style={{ height: `${height}px` }}
					>
						<MapContainer
							center={[center.lat, center.lng]}
							zoom={zoom}
							scrollWheelZoom
							className="h-full w-full"
						>
							<TileLayer
								attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
								url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
							/>
							{markerEntries.map(
								(marker) => {
									const isActive = marker.id === activeMarkerId;
									return (
										<CircleMarker
											key={marker.id}
											center={[marker.lat, marker.lng]}
											radius={isActive ? 9 : 7}
											pathOptions={{
												color: isActive ? "#1d4ed8" : "#2563eb",
												fillColor: isActive ? "#1d4ed8" : "#60a5fa",
												fillOpacity: 0.8,
												weight: 2,
											}}
											eventHandlers={{
												click: () => setSelectedMarkerId(marker.id),
											}}
										>
											<Popup>
												<p className="text-sm font-medium text-text">
													{marker.title}
												</p>
												{marker.description ? (
													<p className="text-xs text-text-subtle">
														{marker.description}
													</p>
												) : null}
											</Popup>
										</CircleMarker>
									);
								},
							)}
						</MapContainer>
					</div>
					{activeMarker ? (
						<div className="rounded-lg border border-border bg-surface-raised p-3">
							<p className="text-sm font-medium text-text">
								{activeMarker.title}
							</p>
							{activeMarker.description ? (
								<p className="mt-1 text-xs text-text-subtle">
									{activeMarker.description}
								</p>
							) : null}
						</div>
					) : (
						<div className="rounded-lg border border-dashed border-border bg-surface p-3 text-xs text-text-subtle">
							No marker selected.
						</div>
					)}
				</div>
			);
		},

		// ── Layout (extended) ─────────────────────────
		Breadcrumb: ({ props }) => {
			const { items } = props;
			return (
				<BreadcrumbRoot>
					<BreadcrumbList>
						{items.map((item, i) => (
							<Fragment key={`crumb-${i}`}>
								{i > 0 ? <BreadcrumbSeparator /> : null}
								<BreadcrumbItem>
									{item.href && i < items.length - 1 ? (
										<BreadcrumbLink href={toSafeText(item.href)}>{toSafeText(item.label)}</BreadcrumbLink>
									) : (
										<BreadcrumbPage>{toSafeText(item.label)}</BreadcrumbPage>
									)}
								</BreadcrumbItem>
							</Fragment>
						))}
					</BreadcrumbList>
				</BreadcrumbRoot>
			);
		},

		PageHeader: ({ props }) => {
			const { title, description } = props;
			return <PageHeader title={toSafeText(title)} description={toSafeOptionalText(description)} />;
		},

		ButtonGroup: ({ props, children }) => {
			const { orientation = "horizontal" } = props;
			return <ButtonGroupPrimitive orientation={orientation}>{children}</ButtonGroupPrimitive>;
		},

		ProgressBar: ({ props }) => {
			const { value, label, appearance = "default" } = props;
			return (
				<ProgressBar value={value} variant={nu(appearance)}>
					{label ? <ProgressBarLabel>{toSafeText(label)}</ProgressBarLabel> : null}
				</ProgressBar>
			);
		},

		ProgressTracker: ({ props }) => {
			const { steps } = props;
			const mappedSteps = steps.map((step, i) => ({
				id: `step-${i}`,
				label: toSafeText(step.label),
				state: (step.state ?? "todo") as "todo" | "current" | "done",
			}));
			return <ProgressTracker steps={mappedSteps} />;
		},

		// ── Interactive (extended) ────────────────────
		Checkbox: ({ props, bindings }) => {
			const { label, disabled } = props;
			const [checked, setChecked] = useBoundProp<boolean>(nu(props.checked), bindings?.checked);
			return (
				<div className="flex items-center gap-2">
					<CheckboxPrimitive
						checked={checked ?? false}
						onCheckedChange={(v) => setChecked(v as boolean)}
						disabled={nu(disabled)}
					/>
					{label ? <Label className="font-normal">{toSafeText(label)}</Label> : null}
				</div>
			);
		},

		Switch: ({ props, bindings }) => {
			const { label, size = "default", disabled } = props;
			const [checked, setChecked] = useBoundProp<boolean>(nu(props.checked), bindings?.checked);
			return (
				<div className="flex items-center gap-2">
					<SwitchPrimitive
						checked={checked ?? false}
						onCheckedChange={setChecked}
						size={nu(size)}
						disabled={nu(disabled)}
					/>
					{label ? <Label className="font-normal">{toSafeText(label)}</Label> : null}
				</div>
			);
		},

		TextArea: ({ props, bindings }) => {
			const { placeholder, label, rows = 3 } = props;
			const [value, setValue] = useBoundProp<string>(nu(props.value), bindings?.value);
			return (
				<div className="space-y-2">
					{label ? <Label>{toSafeText(label)}</Label> : null}
					<Textarea
						placeholder={toSafeOptionalText(placeholder)}
						value={value ?? ""}
						onChange={(e) => setValue(e.target.value)}
						rows={nu(rows)}
					/>
				</div>
			);
		},

		Slider: ({ props, bindings }) => {
			const { min = 0, max = 100, step = 1, label } = props;
			const [value, setValue] = useBoundProp<number>(nu(props.value), bindings?.value);
			return (
				<div className="space-y-2">
					{label ? <Label>{toSafeText(label)}</Label> : null}
					<SliderPrimitive
						value={[value ?? (min ?? 0)]}
						onValueChange={(v) => setValue(Array.isArray(v) ? v[0] : v)}
						min={nu(min)}
						max={nu(max)}
						step={nu(step)}
					/>
				</div>
			);
		},

		Toggle: ({ props, bindings }) => {
			const { text, variant = "default", size = "default" } = props;
			const [pressed, setPressed] = useBoundProp<boolean>(nu(props.pressed), bindings?.pressed);
			return (
				<TogglePrimitive
					variant={variant}
					size={size}
					pressed={pressed ?? false}
					onPressedChange={setPressed}
				>
					{toSafeText(text)}
				</TogglePrimitive>
			);
		},

		ToggleGroup: ({ props, bindings }) => {
			const { options, type = "single" } = props;
			const [value, setValue] = useBoundProp<string | string[]>(nu(props.value), bindings?.value);
			const arrayValue = type === "multiple"
				? (Array.isArray(value) ? value : (value ? [value] : []))
				: (typeof value === "string" && value ? [value] : []);
			return (
				<ToggleGroupPrimitive
					value={arrayValue}
					onValueChange={(v: string[]) => {
						if (type === "multiple") {
							setValue(v);
						} else {
							setValue(v[0] ?? "");
						}
					}}
				>
					{options.map((opt: { label: string; value: string }) => (
						<ToggleGroupItem key={toSafeText(opt.value)} value={toSafeText(opt.value)}>
							{toSafeText(opt.label)}
						</ToggleGroupItem>
					))}
				</ToggleGroupPrimitive>
			);
		},

		// ── Charts (extended) ─────────────────────────
		AreaChart: ({ props }) => {
			const { xKey, yKey, aggregate, color, height } = props;
			const title = toSafeOptionalText(props.title);
			const rawData = toDataArray(props.data);
			const { items, valueKey } = processChartData(rawData, xKey, yKey, aggregate);
			const fillColor = color ?? "var(--color-chart-1)";
			const config: ChartConfig = { [valueKey]: { label: valueKey, color: fillColor } };
			return (
				<div>
					{title ? <p className="mb-2 text-sm font-medium text-text">{title}</p> : null}
					<ChartContainer config={config} className="min-h-[200px] w-full" style={height ? { height } : undefined}>
						<RechartsAreaChart data={items}>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis dataKey={aggregate ? "label" : xKey} tick={{ fontSize: 12 }} />
							<YAxis tick={{ fontSize: 12 }} />
							<ChartTooltip content={<ChartTooltipContent />} />
							<Area
								type="monotone"
								dataKey={valueKey}
								stroke={fillColor}
								fill={fillColor}
								fillOpacity={0.2}
								strokeWidth={2}
							/>
						</RechartsAreaChart>
					</ChartContainer>
				</div>
			);
		},

		RadarChart: ({ props }) => {
			const { data, dataKey, categories, colors } = props;
			const title = toSafeOptionalText(props.title);
			const config: ChartConfig = {};
			for (let i = 0; i < categories.length; i++) {
				config[categories[i]] = { label: toSafeText(categories[i]), color: colors?.[i] ?? PIE_COLORS[i % PIE_COLORS.length] };
			}
			return (
				<div>
					{title ? <p className="mb-2 text-sm font-medium text-text">{title}</p> : null}
					<ChartContainer config={config} className="min-h-[200px] w-full">
						<RechartsRadarChart data={data as Record<string, unknown>[]}>
							<PolarGrid />
							<PolarAngleAxis dataKey={dataKey} tick={{ fontSize: 12 }} />
							<PolarRadiusAxis tick={{ fontSize: 10 }} />
							<ChartTooltip content={<ChartTooltipContent />} />
							{categories.map((cat: string, i: number) => (
								<Radar
									key={cat}
									name={cat}
									dataKey={cat}
									stroke={colors?.[i] ?? PIE_COLORS[i % PIE_COLORS.length]}
									fill={colors?.[i] ?? PIE_COLORS[i % PIE_COLORS.length]}
									fillOpacity={0.2}
								/>
							))}
						</RechartsRadarChart>
					</ChartContainer>
				</div>
			);
		},

		// ── 3D ─────────────────────────────────────────
		Scene3D: ({ props, children }) => (
			<Suspense fallback={<div className="flex items-center justify-center bg-bg-neutral rounded-lg" style={{ height: nu(props.height) }}>Loading 3D scene...</div>}>
				<Scene3DImpl props={{ background: nu(props.background), cameraPosition: nu(props.cameraPosition), height: nu(props.height), orbitControls: nu(props.orbitControls) }}>{children}</Scene3DImpl>
			</Suspense>
		),

		Group3D: ({ props, children }) => (
			<group
				position={nu(props.position)}
				rotation={nu(props.rotation)}
				userData={{ animate: props.animate }}
			>
				{children}
			</group>
		),

		Box: ({ props }) => (
			<mesh position={nu(props.position)}>
				<boxGeometry args={props.size ?? [1, 1, 1]} />
				<meshStandardMaterial color={nu(props.color)} />
			</mesh>
		),

		Sphere: ({ props }) => (
			<mesh position={nu(props.position)}>
				<sphereGeometry args={[nu(props.radius), 32, 32]} />
				<meshStandardMaterial color={nu(props.color)} />
			</mesh>
		),

		Cylinder: ({ props }) => (
			<mesh position={nu(props.position)}>
				<cylinderGeometry args={[nu(props.radiusTop), nu(props.radiusBottom), nu(props.height), 32]} />
				<meshStandardMaterial color={nu(props.color)} />
			</mesh>
		),

		Cone: ({ props }) => (
			<mesh position={nu(props.position)}>
				<coneGeometry args={[nu(props.radius), nu(props.height), 32]} />
				<meshStandardMaterial color={nu(props.color)} />
			</mesh>
		),

		Torus: ({ props }) => (
			<mesh position={nu(props.position)}>
				<torusGeometry args={[nu(props.radius), nu(props.tube), 16, 48]} />
				<meshStandardMaterial color={nu(props.color)} />
			</mesh>
		),

		Plane: ({ props }) => (
			<mesh position={nu(props.position)} rotation={nu(props.rotation)}>
				<planeGeometry args={props.size ?? [10, 10]} />
				<meshStandardMaterial color={nu(props.color)} />
			</mesh>
		),

		Ring: ({ props }) => (
			<mesh position={nu(props.position)} rotation={nu(props.rotation)}>
				<ringGeometry args={[nu(props.innerRadius), nu(props.outerRadius), 32]} />
				<meshStandardMaterial color={nu(props.color)} side={2} />
			</mesh>
		),

		AmbientLight: ({ props }) => <ambientLight intensity={nu(props.intensity)} color={nu(props.color)} />,

		PointLight: ({ props }) => <pointLight position={nu(props.position)} intensity={nu(props.intensity)} color={nu(props.color)} />,

		DirectionalLight: ({ props }) => <directionalLight position={nu(props.position)} intensity={nu(props.intensity)} color={nu(props.color)} />,

		Stars: ({ props }) => (
			<Suspense fallback={null}>
				<StarsImpl count={nu(props.count)} radius={nu(props.radius)} depth={nu(props.depth)} />
			</Suspense>
		),

		Label3D: ({ props }) => (
			<Suspense fallback={null}>
				<Label3DImpl text={toSafeText(props.text)} position={nu(props.position)} color={nu(props.color)} fontSize={nu(props.fontSize)} />
			</Suspense>
		),
	},
	actions: {
		setState: async (params, setState) => {
			if (!params) return;
			setState((prev) => {
				const next = cloneStateModel(prev);
				setByPath(next, params.statePath, params.value);
				return next;
			});
		},
		pushState: async (params, setState) => {
			if (!params) return;
			setState((prev) => {
				const currentValue = getByPath(prev, params.statePath);
				const currentItems = Array.isArray(currentValue) ? currentValue : [];
				const next = cloneStateModel(prev);
				setByPath(next, params.statePath, [...currentItems, params.value]);
				if (params.clearStatePath) {
					setByPath(next, params.clearStatePath, "");
				}
				return next;
			});
		},
		removeState: async (params, setState) => {
			if (!params) return;
			const index = Math.trunc(params.index);
			if (!Number.isFinite(index) || index < 0) return;
			setState((prev) => {
				const currentValue = getByPath(prev, params.statePath);
				if (!Array.isArray(currentValue) || index >= currentValue.length) {
					return prev;
				}

				const next = cloneStateModel(prev);
				setByPath(
					next,
					params.statePath,
					currentValue.filter((_, itemIndex) => itemIndex !== index),
				);
				return next;
			});
		},
		push: async (params, setState) => {
			if (!params) return;
			setState((prev) => {
				const currentScreenValue = getByPath(prev, "/currentScreen");
				const currentScreen = typeof currentScreenValue === "string" ? currentScreenValue : "";
				const navStackValue = getByPath(prev, "/navStack");
				const navStack = Array.isArray(navStackValue) ? navStackValue : [];
				const next = cloneStateModel(prev);
				setByPath(next, "/navStack", [...navStack, currentScreen]);
				setByPath(next, "/currentScreen", params.screen);
				return next;
			});
		},
		pop: async (_params, setState) => {
			setState((prev) => {
				const navStackValue = getByPath(prev, "/navStack");
				if (!Array.isArray(navStackValue) || navStackValue.length === 0) {
					return prev;
				}

				const next = cloneStateModel(prev);
				const previousScreen = navStackValue[navStackValue.length - 1];
				setByPath(next, "/navStack", navStackValue.slice(0, -1));
				setByPath(next, "/currentScreen", typeof previousScreen === "string" ? previousScreen : "");
				return next;
			});
		},
	},
});

// ── Lazy wrappers for drei components ──────────────────────────
const StarsImpl = lazy(() =>
	import("@react-three/drei").then((mod) => ({
		default: (p: { count?: number; radius?: number; depth?: number }) => (
			<mod.Stars count={p.count} radius={p.radius} depth={p.depth} />
		),
	})),
);

const Label3DImpl = lazy(() =>
	import("@react-three/drei").then((mod) => ({
		default: (p: { text: string; position?: [number, number, number]; color?: string; fontSize?: number }) => (
			<mod.Text position={p.position} color={p.color} fontSize={p.fontSize} anchorX="center" anchorY="middle">
				{p.text}
			</mod.Text>
		),
	})),
);
