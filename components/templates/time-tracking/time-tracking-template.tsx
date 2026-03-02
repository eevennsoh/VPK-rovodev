"use client";

import { useState, useCallback } from "react";
import { format, addDays, subDays, addWeeks, subWeeks } from "date-fns";
import ChevronLeftIcon from "@atlaskit/icon/core/chevron-left";
import ChevronRightIcon from "@atlaskit/icon/core/chevron-right";
import ClockIcon from "@atlaskit/icon/core/clock";
import AddIcon from "@atlaskit/icon/core/add";
import UndoIcon from "@atlaskit/icon/core/undo";
import { Button } from "@/components/ui/button";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Task, ViewMode } from "@/lib/time-tracking-types";
import {
	getInitialTimeTrackingState,
	findEntry,
} from "@/lib/time-tracking-data";
import { DailyView } from "@/components/blocks/time-tracking/daily-view";
import { WeeklyView } from "@/components/blocks/time-tracking/weekly-view";
import { TimeSummary } from "@/components/blocks/time-tracking/time-summary";
import { TimeEntryForm } from "@/components/blocks/time-tracking/time-entry-form";

export function TimeTrackingTemplate() {
	const [state, setState] = useState(() => getInitialTimeTrackingState());

	// Form state
	const [formOpen, setFormOpen] = useState(false);

	// ── View mode ──────────────────────────────────────────────────────────

	const handleViewChange = useCallback((value: string | null) => {
		if (value === "daily" || value === "weekly") {
			setState((prev) => ({ ...prev, viewMode: value as ViewMode }));
		}
	}, []);

	// ── Date navigation ───────────────────────────────────────────────────

	const navigatePrev = useCallback(() => {
		setState((prev) => ({
			...prev,
			selectedDate: format(
				prev.viewMode === "daily"
					? subDays(new Date(prev.selectedDate + "T00:00:00"), 1)
					: subWeeks(new Date(prev.selectedDate + "T00:00:00"), 1),
				"yyyy-MM-dd",
			),
		}));
	}, []);

	const navigateNext = useCallback(() => {
		setState((prev) => ({
			...prev,
			selectedDate: format(
				prev.viewMode === "daily"
					? addDays(new Date(prev.selectedDate + "T00:00:00"), 1)
					: addWeeks(new Date(prev.selectedDate + "T00:00:00"), 1),
				"yyyy-MM-dd",
			),
		}));
	}, []);

	const goToToday = useCallback(() => {
		setState((prev) => ({
			...prev,
			selectedDate: format(new Date(), "yyyy-MM-dd"),
		}));
	}, []);

	// ── Project expand/collapse ───────────────────────────────────────────

	const handleToggleProject = useCallback((projectId: string) => {
		setState((prev) => ({
			...prev,
			expandedProjects: {
				...prev.expandedProjects,
				[projectId]: !prev.expandedProjects[projectId],
			},
		}));
	}, []);

	// ── Hours change (inline input) ───────────────────────────────────────

	const handleHoursChange = useCallback(
		(taskId: string, projectId: string, date: string, hours: number) => {
			setState((prev) => {
				const existing = findEntry(prev.entries, taskId, date);

				if (hours === 0) {
					// Remove entry if hours set to 0
					if (existing) {
						return {
							...prev,
							entries: prev.entries.filter(
								(e) => e.id !== existing.id,
							),
						};
					}
					return prev;
				}

				if (existing) {
					// Update existing entry
					return {
						...prev,
						entries: prev.entries.map((e) =>
							e.id === existing.id ? { ...e, hours } : e,
						),
					};
				}

				// Create new entry
				return {
					...prev,
					entries: [
						...prev.entries,
						{
							id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
							taskId,
							projectId,
							date,
							hours,
						},
					],
				};
			});
		},
		[],
	);

	// ── Add task ──────────────────────────────────────────────────────────

	const handleAddTask = useCallback((taskData: Omit<Task, "id">) => {
		setState((prev) => {
			const newTask: Task = {
				...taskData,
				id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
			};
			return {
				...prev,
				tasks: [...prev.tasks, newTask],
			};
		});
	}, []);

	// ── Reset ─────────────────────────────────────────────────────────────

	const handleReset = useCallback(() => {
		setState(getInitialTimeTrackingState());
	}, []);

	// ── Render ─────────────────────────────────────────────────────────────

	return (
		<div className="flex min-h-screen flex-col bg-bg-neutral">
			{/* Page Header */}
			<PageHeader
				title="Time Tracking"
				description="Log and track your work hours across projects"
				className="border-b border-border-subtle bg-surface px-6 py-5"
				breadcrumbs={
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink href="/">Home</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>Time Tracking</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				}
			/>

			{/* Controls Bar */}
			<div className="border-b border-border-subtle bg-surface-raised px-6 py-3">
				<div className="mx-auto flex max-w-[1400px] items-center justify-between">
					{/* Left: View toggle + date nav */}
					<div className="flex items-center gap-3">
						<Tabs
							value={state.viewMode}
							onValueChange={handleViewChange}
						>
							<TabsList>
								<TabsTrigger value="daily">Daily</TabsTrigger>
								<TabsTrigger value="weekly">Weekly</TabsTrigger>
							</TabsList>
						</Tabs>

						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="icon"
								onClick={navigatePrev}
								className="size-8"
							>
								<ChevronLeftIcon label="Previous" size="small" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={goToToday}
								className="gap-1.5 px-3"
							>
								<ClockIcon label="" size="small" />
								Today
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onClick={navigateNext}
								className="size-8"
							>
								<ChevronRightIcon label="Next" size="small" />
							</Button>
						</div>
					</div>

					{/* Right: Add Task + Reset */}
					<div className="flex items-center gap-2">
						<Button
							variant="default"
							size="sm"
							onClick={() => setFormOpen(true)}
							className="gap-1.5"
						>
							<AddIcon label="" size="small" />
							Add Task
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={handleReset}
							className="gap-1.5"
						>
							<UndoIcon label="" size="small" />
							Reset
						</Button>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 overflow-auto">
				<div className="mx-auto flex max-w-[1400px] gap-6 px-6 py-6">
					{/* Task Table */}
					<div className="flex-1">
						{state.viewMode === "daily" ? (
							<DailyView
								date={state.selectedDate}
								entries={state.entries}
								projects={state.projects}
								tasks={state.tasks}
								expandedProjects={state.expandedProjects}
								onToggleProject={handleToggleProject}
								onHoursChange={handleHoursChange}
							/>
						) : (
							<WeeklyView
								anchorDate={state.selectedDate}
								entries={state.entries}
								projects={state.projects}
								tasks={state.tasks}
								expandedProjects={state.expandedProjects}
								onToggleProject={handleToggleProject}
								onHoursChange={handleHoursChange}
							/>
						)}
					</div>

					{/* Sidebar Summary */}
					<div className="w-64 shrink-0">
						<TimeSummary
							entries={state.entries}
							projects={state.projects}
							selectedDate={state.selectedDate}
							weeklyTargetHours={state.weeklyTargetHours}
						/>
					</div>
				</div>
			</div>

			{/* Add Task Dialog */}
			<TimeEntryForm
				open={formOpen}
				onOpenChange={setFormOpen}
				projects={state.projects}
				onAddTask={handleAddTask}
			/>
		</div>
	);
}
