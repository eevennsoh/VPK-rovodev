"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import CopyIcon from "@atlaskit/icon/core/copy";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import UndoIcon from "@atlaskit/icon/core/undo";
import VideoPlayIcon from "@atlaskit/icon/core/video-play";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type GUIPanelContextValue = Readonly<{
	registerKeys: (keys: readonly string[]) => void;
	unregisterKeys: (keys: readonly string[]) => void;
}>;

const GUIPanelContext = createContext<GUIPanelContextValue | null>(null);

/** Register value keys so GUI.Panel only copies values for mounted controls. */
function useGUIValueKeys(valueKeys?: string | readonly string[]) {
	const ctx = use(GUIPanelContext);
	const normalized = valueKeys == null ? [] : Array.isArray(valueKeys) ? valueKeys : [valueKeys];
	const serialized = normalized.join("\0");

	useEffect(() => {
		if (!ctx || normalized.length === 0) return;
		ctx.registerKeys(normalized);
		return () => ctx.unregisterKeys(normalized);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ctx, serialized]);
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

function formatValue(value: number, step: number, unit?: string): string {
	const digits = step < 1 ? String(step).split(".")[1]?.length ?? 0 : 0;
	const display = digits > 0 ? value.toFixed(digits) : String(Math.round(value));
	return unit ? `${display}${unit}` : display;
}

type GUIControlProps = Readonly<{
	id: string;
	label: string;
	description?: string;
	value: number;
	defaultValue?: number;
	min: number;
	max: number;
	step: number;
	unit?: string;
	onChange: (next: number) => void;
	valueKeys?: string | readonly string[];
}>;

function GUIControl({
	id,
	label,
	description,
	value,
	defaultValue,
	min,
	max,
	step,
	unit,
	onChange,
	valueKeys,
}: GUIControlProps) {
	useGUIValueKeys(valueKeys);
	const [localInput, setLocalInput] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);

	const displayValue = localInput ?? String(value);

	const commitRaw = (raw: string) => {
		setLocalInput(raw);
		const parsed = Number(raw);
		if (raw.length > 0 && Number.isFinite(parsed)) {
			onChange(parsed);
		}
	};

	const isDefault = defaultValue !== undefined && value === defaultValue;

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between gap-2">
				<Label htmlFor={`${id}-input`} className="text-xs font-medium text-text">
					{label}
				</Label>
				<div className="flex items-center gap-1">
					{defaultValue !== undefined ? (
						<button
							type="button"
							aria-label={`Reset ${label} to ${defaultValue}`}
							disabled={isDefault}
							onClick={() => {
								onChange(defaultValue);
								setLocalInput(null);
							}}
							className="flex size-7 items-center justify-center rounded text-icon-subtle transition-colors hover:bg-bg-neutral hover:text-icon disabled:pointer-events-none disabled:opacity-0"
						>
							<UndoIcon label="" size="small" />
						</button>
					) : null}
					<Input
						ref={inputRef}
						id={`${id}-input`}
						type="text"
						inputMode="decimal"
						isCompact
						value={displayValue}
						onChange={(event) => {
							commitRaw(event.currentTarget.value);
						}}
						onFocus={() => {
							setLocalInput(String(value));
						}}
						onBlur={() => {
							setLocalInput(null);
						}}
						onKeyDown={(event) => {
							if (event.key === "-") {
								event.preventDefault();
								const current = localInput ?? String(value);
								const toggled = current.startsWith("-")
									? current.slice(1)
									: `-${current}`;
								commitRaw(toggled);
								requestAnimationFrame(() => {
									inputRef.current?.setSelectionRange(
										toggled.length,
										toggled.length,
									);
								});
							}
						}}
						className="h-7 w-20 text-right font-mono text-xs tabular-nums"
					/>
					<span className="w-8 text-right text-[11px] text-text-subtle">
						{unit ?? ""}
					</span>
				</div>
			</div>
			{description ? (
				<p className="text-[12px] leading-4 text-text-subtlest">
					{description}
				</p>
			) : null}
			<Slider
				aria-label={label}
				min={min}
				max={max}
				step={step}
				value={[clamp(value, min, max)]}
				onValueChange={(nextValue) => {
					const numericValue = Array.isArray(nextValue) ? nextValue[0] : nextValue;
					if (typeof numericValue !== "number") return;
					onChange(clamp(numericValue, min, max));
				}}
			/>
			<div className="flex justify-between font-mono text-[11px] text-text-subtlest">
				<span>{formatValue(min, step, unit)}</span>
				<span>{formatValue(max, step, unit)}</span>
			</div>
		</div>
	);
}

type GUIPanelProps = Readonly<{
	title: string;
	values: Record<string, unknown>;
	onPlay?: () => void;
	children: React.ReactNode;
}>;

function GUIPanel({ title, values, onPlay, children }: GUIPanelProps) {
	const [isExpanded, setIsExpanded] = useState(true);
	const [isCopied, setIsCopied] = useState(false);
	const copiedResetTimeoutRef = useRef<number | undefined>(undefined);
	const registeredKeysRef = useRef(new Map<string, number>());
	const hasRegistrationsRef = useRef(false);

	const panelContext = useMemo<GUIPanelContextValue>(() => ({
		registerKeys: (keys) => {
			for (const key of keys) {
				registeredKeysRef.current.set(key, (registeredKeysRef.current.get(key) ?? 0) + 1);
			}
			hasRegistrationsRef.current = true;
		},
		unregisterKeys: (keys) => {
			for (const key of keys) {
				const count = registeredKeysRef.current.get(key) ?? 0;
				if (count <= 1) {
					registeredKeysRef.current.delete(key);
				} else {
					registeredKeysRef.current.set(key, count - 1);
				}
			}
		},
	}), []);

	useEffect(() => {
		return () => {
			if (copiedResetTimeoutRef.current) {
				window.clearTimeout(copiedResetTimeoutRef.current);
			}
		};
	}, []);

	const handleCopyValues = useCallback(async () => {
		try {
			const valuesToCopy = hasRegistrationsRef.current
				? Object.fromEntries(
					Object.entries(values).filter(([key]) => registeredKeysRef.current.has(key)),
				)
				: values;
			await navigator.clipboard.writeText(`${JSON.stringify(valuesToCopy, null, 2)}\n`);
			setIsCopied(true);
			if (copiedResetTimeoutRef.current) {
				window.clearTimeout(copiedResetTimeoutRef.current);
			}
			copiedResetTimeoutRef.current = window.setTimeout(() => {
				setIsCopied(false);
			}, 1400);
		} catch {
			setIsCopied(false);
		}
	}, [values]);

	return (
		<GUIPanelContext value={panelContext}>
			<Card className="w-full gap-0 p-0">
				<div className="flex items-center gap-2 px-3 py-2.5">
					<span className="flex-1 text-xs font-semibold">{title}</span>
					{onPlay ? (
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-7 gap-1 px-2 text-xs"
							onClick={onPlay}
						>
							<VideoPlayIcon label="" size="small" />
							Play
						</Button>
					) : null}
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-7 gap-1 px-2 text-xs"
						onClick={() => {
							void handleCopyValues();
						}}
					>
						<CopyIcon label="" size="small" />
						{isCopied ? "Copied" : "Copy values"}
					</Button>
					<button
						type="button"
						aria-label={isExpanded ? "Collapse controls" : "Expand controls"}
						onClick={() => {
							setIsExpanded((prev) => !prev);
						}}
						className="flex size-7 items-center justify-center rounded text-icon-subtle transition-colors hover:bg-bg-neutral hover:text-icon"
					>
						<span
							className="inline-flex transition-transform duration-200 ease-in-out"
							style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
						>
							<ChevronDownIcon label="" size="small" />
						</span>
					</button>
				</div>
				<div
					className="grid transition-[grid-template-rows] duration-200 ease-in-out"
					style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
				>
					<div className="min-h-0 overflow-hidden">
						<CardContent className="space-y-4 px-3 py-3">
							{children}
						</CardContent>
					</div>
				</div>
			</Card>
		</GUIPanelContext>
	);
}

type GUIToggleProps = Readonly<{
	id: string;
	label: string;
	description?: string;
	checked: boolean;
	onChange: (next: boolean) => void;
	valueKeys?: string | readonly string[];
}>;

function GUIToggle({ id, label, description, checked, onChange, valueKeys }: GUIToggleProps) {
	useGUIValueKeys(valueKeys);
	const switchId = `${id}-toggle`;

	return (
		<div className="space-y-1">
			<div className="flex items-center justify-between gap-2">
				<Label htmlFor={switchId} className="text-xs font-medium text-text">
					{label}
				</Label>
				<Switch
					id={switchId}
					checked={checked}
					onCheckedChange={onChange}
					label={label}
				/>
			</div>
			{description ? (
				<p className="text-[12px] leading-4 text-text-subtlest">
					{description}
				</p>
			) : null}
		</div>
	);
}

type GUISelectOption<T extends string> = Readonly<{
	value: T;
	label: string;
}>;

type GUISelectProps<T extends string> = Readonly<{
	id: string;
	label: string;
	description?: string;
	value: T;
	options: readonly GUISelectOption<T>[];
	onChange: (next: T) => void;
	valueKeys?: string | readonly string[];
}>;

function GUISelect<T extends string>({
	id,
	label,
	description,
	value,
	options,
	onChange,
	valueKeys,
}: GUISelectProps<T>) {
	useGUIValueKeys(valueKeys);
	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between gap-2">
				<Label htmlFor={`${id}-select`} className="text-xs font-medium text-text">
					{label}
				</Label>
				<div className="flex gap-0.5 rounded-md bg-bg-neutral p-0.5">
					{options.map((option) => (
						<button
							key={option.value}
							type="button"
							onClick={() => {
								onChange(option.value);
							}}
							className={cn(
								"rounded px-2 py-0.5 text-[11px] font-medium transition-colors",
								value === option.value
									? "bg-surface text-text shadow-sm"
									: "text-text-subtle hover:text-text",
							)}
						>
							{option.label}
						</button>
					))}
				</div>
			</div>
			{description ? (
				<p className="text-[12px] leading-4 text-text-subtlest">
					{description}
				</p>
			) : null}
		</div>
	);
}

export const GUI = {
	Control: GUIControl,
	Panel: GUIPanel,
	Toggle: GUIToggle,
	Select: GUISelect,
} as const;
