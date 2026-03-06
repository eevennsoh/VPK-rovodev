"use client";

import Heading from "@/components/blocks/shared-ui/heading";

interface SidebarEmptyStateProps {
	onNewChat: () => void;
	onNewPlan: () => void;
}

export default function SidebarEmptyState({ onNewChat, onNewPlan }: Readonly<SidebarEmptyStateProps>) {
	return (
		<div className="flex w-full flex-col items-center gap-4 px-6 text-center">
			<div className="flex w-full flex-col items-center gap-1">
				<Heading as="h3" size="xsmall">
					Get started
				</Heading>
				<p className="text-sm text-text-subtle">
					Start a conversation or create a new plan.
				</p>
			</div>
			<div className="flex w-full flex-row gap-2">
				<button
					type="button"
					onClick={onNewChat}
					className="flex flex-1 cursor-pointer items-center justify-center rounded-full border border-dashed border-border bg-transparent px-3 py-1.5 text-sm font-medium text-text-subtle transition-colors hover:bg-bg-neutral active:bg-bg-neutral"
				>
					Chat
				</button>
				<button
					type="button"
					onClick={onNewPlan}
					className="flex flex-1 cursor-pointer items-center justify-center rounded-full border border-dashed border-border bg-transparent px-3 py-1.5 text-sm font-medium text-text-subtle transition-colors hover:bg-bg-neutral active:bg-bg-neutral"
				>
					Plan
				</button>
			</div>
		</div>
	);
}
