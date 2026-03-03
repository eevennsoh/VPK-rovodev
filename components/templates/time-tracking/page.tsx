"use client";

import { useState, useCallback } from "react";
import { format, addDays, subDays, addWeeks, subWeeks } from "date-fns";
import ChevronLeftIcon from "@atlaskit/icon/core/chevron-left";
import ChevronRightIcon from "@atlaskit/icon/core/chevron-right";
import AddIcon from "@atlaskit/icon/core/add";
import ClockIcon from "@atlaskit/icon/core/clock";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { token } from "@/lib/tokens";
import type {
	ViewMode,
	TimeEntry,
	Task,
} from "@/lib/time-tracking-types";
import {
	getInitialTimeTrackingState,
	findEntry,
	getWeekDays,
} from "@/lib/time-tracking-data";
import { DailyView } from "@/components/blocks/time-tracking/daily-view";
import { WeeklyView } from "@/components/blocks/time-tracking/weekly-view";
import { TimeEntryForm } from "@/components/blocks/time-tracking/time-entry-form";
import { TimeSummary } from "@/components/blocks/time-tracking/time-summary";

// ── Timer state ──────────────────────────────────────────────────────────

interface TimerState {
	isRunning: boolean;
	taskId: string | null;
	projectId: string | null;
	startTime: number | null; // timestamp ms
	elapsed: number; // seconds
}

const INITIAL_TIMER: TimerState = {
	isRunning: false,
	taskId: null,
	projectId: null,
	startTime: null,
	elapsed: 0,
};

// ── Helpers ──────────────────────────────────────────────────────────────

function formatElapsed(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Main template ────────────────────────────────────────────────────────

export default function TimeTrackingView() {
	// ── Core state ───────────────────────────────────────────────────────
	const [state, setState] = useState(getInitialTimeTrackingState);
	const { entries, projects, tasks, viewMode, selectedDate, weeklyTargetHours, expandedProjects } = state;

	// ── UI state ─────────────────────────────────────────────────────────
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [timer, setTimer] = useState<TimerState>(INITIAL_TIMER);
	const [timerInterval, setTimerInterval] = useState<ReturnType<typeof setInterval> | null>(null);

	// ── View mode ────────────────────────────────────────────────────────
	const setViewMode = useCallback((mode: ViewMode) => {
		setState((prev) => ({ ...prev, viewMode: mode }));
	}, []);

	// ── Date navigation ──────────────────────────────────────────────────
	const navigateDate = useCallback(
		(direction: "prev" | "next") => {
			setState((prev) => {
				const current = new Date(prev.selectedDate + "T00:00:00");
				const next =
					prev.viewMode === "daily"
						? direction === "prev"
							? subDays(current, 1)
							: addDays(current, 1)
						: direction === "prev"
							? subWeeks(current, 1)
							: addWeeks(current, 1);
				return { ...prev, selectedDate: format(next, "yyyy-MM-dd") };
			});
		},
		[],
	);

	const goToToday = useCallback(() => {
		setState((prev) => ({
			...prev,
			selectedDate: format(new Date(), "yyyy-MM-dd"),
		}));
	}, []);

	// ── Entry mutations ──────────────────────────────────────────────────
	const handleHoursChange = useCallback(
		(taskId: string, projectId: string, date: string, hours: number) => {
			setState((prev) => {
				const existing = findEntry(prev.entries, taskId, date);
				let nextEntries: TimeEntry[];

				if (existing) {
					if (hours === 0) {
						// Remove entry
						nextEntries = prev.entries.filter((e) => e.id !== existing.id);
					} else {
						// Update entry
						nextEntries = prev.entries.map((e) =>
							e.id === existing.id ? { ...e, hours } : e,
						);
					}
				} else if (hours > 0) {
					// Create entry
					nextEntries = [
						...prev.entries,
						{
							id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
							taskId,
							projectId,
							date,
							hours,
						},
					];
				} else {
					return prev;
				}

				return { ...prev, entries: nextEntries };
			});
		},
		[],
	);

	// ── Task mutations ───────────────────────────────────────────────────
	const handleAddTask = useCallback((task: Omit<Task, "id">) => {
		setState((prev) => ({
			...prev,
			tasks: [
				...prev.tasks,
				{
					...task,
					id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
				},
			],
		}));
	}, []);

	const handleDeleteTask = useCallback((taskId: string) => {
		setState((prev) => ({
			...prev,
			tasks: prev.tasks.filter((t) => t.id !== taskId),
			entries: prev.entries.filter((e) => e.taskId !== taskId),
		}));
	}, []);

	// ── Project toggle ───────────────────────────────────────────────────
	const handleToggleProject = useCallback((projectId: string) => {
		setState((prev) => ({
			...prev,
			expandedProjects: {
				...prev.expandedProjects,
				[projectId]: !(prev.expandedProjects[projectId] ?? true),
			},
		}));
	}, []);

	// ── Weekly target ────────────────────────────────────────────────────
	const handleTargetHoursChange = useCallback((hours: number) => {
		setState((prev) => ({ ...prev, weeklyTargetHours: hours }));
	}, []);

	// ── Timer ────────────────────────────────────────────────────────────
	const startTimer = useCallback(
		(taskId: string, projectId: string) => {
			// Stop any existing timer first
			if (timerInterval) {
				clearInterval(timerInterval);
			}

			const now = Date.now();
			setTimer({
				isRunning: true,
				taskId,
				projectId,
				startTime: now,
				elapsed: 0,
			});

			const interval = setInterval(() => {
				setTimer((prev) => ({
					...prev,
					elapsed: Math.floor((Date.now() - now) / 1000),
				}));
			}, 1000);
			setTimerInterval(interval);
		},
		[timerInterval],
	);

	const stopTimer = useCallback(() => {
		if (timerInterval) {
			clearInterval(timerInterval);
			setTimerInterval(null);
		}

		setTimer((prev) => {
			if (prev.taskId && prev.projectId && prev.elapsed > 0) {
				// Convert elapsed seconds to hours (rounded to nearest 0.5)
				const hours = Math.max(0.5, Math.round((prev.elapsed / 3600) * 2) / 2);
				const today = format(new Date(), "yyyy-MM-dd");
				handleHoursChange(prev.taskId, prev.projectId, today, hours);
			}
			return INITIAL_TIMER;
		});
	}, [timerInterval, handleHoursChange]);

	// ── Date display label ───────────────────────────────────────────────
	const dateLabel = (() => {
		const dateObj = new Date(selectedDate + "T00:00:00");
		if (viewMode === "daily") {
			return new Intl.DateTimeFormat(undefined, {
				weekday: "long",
				month: "long",
				day: "numeric",
				year: "numeric",
			}).format(dateObj);
		}
		// Weekly: show range
		const days = getWeekDays(selectedDate);
		if (days.length < 2) return selectedDate;
		const start = new Date(days[0] + "T00:00:00");
		const end = new Date(days[days.length - 1] + "T00:00:00");
		const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
		return `${fmt.format(start)} – ${fmt.format(end)}, ${start.getFullYear()}`;
	})();

	// ── Get first available task for timer quick-start ────────────────────
	const firstTask = tasks[0];
	const firstProject = firstTask
		? projects.find((p) => p.id === firstTask.projectId)
		: null;

	return (
		<div
			className="flex h-screen flex-col"
			style={{ backgroundColor: token("color.background.neutral.subtle") }}
		>
			{/* ── Header ─────────────────────────────────────────────────── */}
			<div className="border-b border-border-subtle bg-surface px-6 py-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<h1 className="text-xl font-semibold text-text">
							Time Tracking
						</h1>

						{/* Timer indicator */}
						{timer.isRunning ? (
							<div className="flex items-center gap-2 rounded-lg border border-border-success bg-bg-success-subtle px-3 py-1.5">
								<span className="size-2 animate-pulse rounded-full bg-bg-success-bold" />
								<span className="text-sm font-mono font-medium text-text-success">
									{formatElapsed(timer.elapsed)}
								</span>
								<span className="text-xs text-text-subtle">
									{tasks.find((t) => t.id === timer.taskId)?.name}
								</span>
								<Button
									variant="ghost"
									size="sm"
									className="h-6 px-2 text-xs"
									onClick={stopTimer}
								>
									Stop
								</Button>
							</div>
						) : null}
					</div>

					<div className="flex items-center gap-2">
						{/* Timer quick-start */}
						{!timer.isRunning && firstTask && firstProject ? (
							<Button
								variant="outline"
								size="sm"
								onClick={() => startTimer(firstTask.id, firstProject.id)}
								className="gap-1.5"
							>
								<ClockIcon label="" size="small" />
								Start Timer
							</Button>
						) : null}

						{/* Add task */}
						<Button
							variant="default"
							size="sm"
							onClick={() => setIsFormOpen(true)}
							className="gap-1.5"
						>
							<AddIcon label="" size="small" />
							Add Task
						</Button>
					</div>
				</div>

				{/* ── Toolbar row ─────────────────────────────────────────── */}
				<div className="mt-3 flex items-center justify-between">
					{/* Date navigation */}
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="icon"
							className="size-8"
							onClick={() => navigateDate("prev")}
						>
							<ChevronLeftIcon label="Previous" size="small" />
						</Button>

						<span className="min-w-[200px] text-center text-sm font-medium text-text">
							{dateLabel}
						</span>

						<Button
							variant="ghost"
							size="icon"
							className="size-8"
							onClick={() => navigateDate("next")}
						>
							<ChevronRightIcon label="Next" size="small" />
						</Button>

						<Button
							variant="outline"
							size="sm"
							className="ml-1 h-7 text-xs"
							onClick={goToToday}
						>
							Today
						</Button>
					</div>

					{/* View mode toggle */}
					<div className="flex items-center rounded-lg border border-border-subtle bg-surface p-0.5">
						<button
							type="button"
							onClick={() => setViewMode("daily")}
							className={cn(
								"rounded-md px-3 py-1 text-sm font-medium transition-colors",
								viewMode === "daily"
									? "bg-bg-selected text-text-selected"
									: "text-text-subtle hover:text-text hover:bg-bg-neutral-subtle-hovered",
							)}
						>
							Daily
						</button>
						<button
							type="button"
							onClick={() => setViewMode("weekly")}
							className={cn(
								"rounded-md px-3 py-1 text-sm font-medium transition-colors",
								viewMode === "weekly"
									? "bg-bg-selected text-text-selected"
									: "text-text-subtle hover:text-text hover:bg-bg-neutral-subtle-hovered",
							)}
						>
							Weekly
						</button>
					</div>
				</div>
			</div>

			{/* ── Content ────────────────────────────────────────────────── */}
			<div className="flex flex-1 gap-6 overflow-auto p-6">
				{/* Main view */}
				<div className="flex-1">
					{viewMode === "daily" ? (
						<DailyView
							date={selectedDate}
							entries={entries}
							projects={projects}
							tasks={tasks}
							expandedProjects={expandedProjects}
							onToggleProject={handleToggleProject}
							onHoursChange={handleHoursChange}
							onDeleteTask={handleDeleteTask}
							activeTimer={
								timer.isRunning && timer.taskId && timer.projectId && timer.startTime
									? { taskId: timer.taskId, projectId: timer.projectId, startedAt: new Date(timer.startTime).toISOString() }
									: null
							}
							onStartTimer={startTimer}
							onStopTimer={stopTimer}
						/>
					) : (
						<WeeklyView
							anchorDate={selectedDate}
							entries={entries}
							projects={projects}
							tasks={tasks}
							expandedProjects={expandedProjects}
							onToggleProject={handleToggleProject}
							onHoursChange={handleHoursChange}
							onDeleteTask={handleDeleteTask}
						/>
					)}
				</div>

				{/* Summary sidebar */}
				<div className="w-[280px] shrink-0">
					<TimeSummary
						entries={entries}
						projects={projects}
						selectedDate={selectedDate}
						weeklyTargetHours={weeklyTargetHours}
						onTargetHoursChange={handleTargetHoursChange}
					/>
				</div>
			</div>

			{/* ── Add task dialog ─────────────────────────────────────────── */}
			<TimeEntryForm
				open={isFormOpen}
				onOpenChange={setIsFormOpen}
				projects={projects}
				onAddTask={handleAddTask}
			/>
		</div>
	);
}
