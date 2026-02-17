"use client";

import { Button } from "@/components/ui/button";
import Heading from "@/components/blocks/shared-ui/heading";

interface SidebarEmptyStateProps {
	onCreateOne: () => void;
}

export default function SidebarEmptyState({ onCreateOne }: Readonly<SidebarEmptyStateProps>) {
	const handleCreateOne = () => {
		onCreateOne();
		const textarea = document.querySelector<HTMLTextAreaElement>(
			'textarea[aria-label="Chat message input"]',
		);
		textarea?.focus();
	};

	return (
		<div className="flex w-full flex-col items-center gap-4 px-6 text-center">
			<div className="flex w-full flex-col items-center gap-1">
				<Heading as="h3" size="xsmall">
					Your agent team is waiting
				</Heading>
				<p className="text-sm text-text-subtle">
					Spin up a team of agents and watch your problems get solved while you
					focus elsewhere.
				</p>
			</div>
			<Button
				variant="ghost"
				className="w-full rounded-full border border-dashed border-border bg-transparent text-text-subtle hover:border-border-bold hover:bg-bg-neutral active:bg-bg-neutral active:border-border-bold"
				onClick={handleCreateOne}
			>
				Create one
			</Button>
		</div>
	);
}
