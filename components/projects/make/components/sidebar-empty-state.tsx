"use client";

import Heading from "@/components/blocks/shared-ui/heading";

interface SidebarEmptyStateProps {
	onNewChat: () => void;
	onNewProject: () => void;
}

export default function SidebarEmptyState({ onNewChat, onNewProject }: Readonly<SidebarEmptyStateProps>) {
	return (
		<div className="flex w-full flex-col items-center gap-4 px-6 text-center">
			<div className="stagger-fade-in flex w-full flex-col items-center gap-1">
				<Heading as="h3" size="xsmall">
					Get started
				</Heading>
				<p className="text-sm text-text-subtle">
					Start a conversation or make something new.
				</p>
			</div>
			<div className="stagger-fade-in flex w-full flex-row gap-2" style={{ animationDelay: "0.06s" }}>
				<button
					type="button"
					onClick={onNewChat}
					className="flex flex-1 cursor-pointer items-center justify-center rounded-full border border-dashed border-border bg-transparent px-3 py-1.5 text-sm font-medium text-text-subtle transition-colors hover:bg-bg-neutral active:bg-bg-neutral"
				>
					Chat
				</button>
				<button
					type="button"
					onClick={onNewProject}
					className="flex flex-1 cursor-pointer items-center justify-center rounded-full border border-dashed border-border bg-transparent px-3 py-1.5 text-sm font-medium text-text-subtle transition-colors hover:bg-bg-neutral active:bg-bg-neutral"
				>
					Make
				</button>
			</div>
		</div>
	);
}
