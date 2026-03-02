"use client";

import { Plan, type PlanTask } from "@/components/ui-ai/plan";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlanTabContent } from "@/components/templates/shared/lib/plan-card-utils";

// ---------------------------------------------------------------------------
// Plan Preview Modal
// ---------------------------------------------------------------------------

interface PlanPreviewModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	tasks: PlanTask[];
	agents: string[];
	onBuild?: () => void;
}

export function PlanPreviewModal({
	open,
	onOpenChange,
	title,
	description,
	tasks,
	agents,
	onBuild,
}: Readonly<PlanPreviewModalProps>) {
	const visibleTasks = tasks.filter((task) => task.label.trim().length > 0);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent size="lg" className="max-h-[85vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
				</DialogHeader>

				<Plan className="min-h-0 flex-1 overflow-y-auto border-0 shadow-none -mx-6 px-6 py-0" defaultOpen>
					<PlanTabContent
						description={description}
						tasks={tasks}
						agents={agents}
						revealedCount={visibleTasks.length}
						tabsListClassName="mx-0"
						summaryTabContentClassName="px-0 pb-0"
						tasksTabContentClassName="px-0 pb-4"
					/>
				</Plan>

				<DialogFooter className="bg-surface">
					{onBuild ? (
						<Button
							onClick={() => {
								onBuild();
								onOpenChange(false);
							}}
						>
							Build
						</Button>
					) : null}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
