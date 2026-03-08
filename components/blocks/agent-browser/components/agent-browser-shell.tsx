"use client";

import { useCallback, useState } from "react";
import GlobeIcon from "@atlaskit/icon/core/globe";
import { token } from "@/lib/tokens";
import { cn } from "@/lib/utils";
import { ManualBrowser } from "./manual-browser";
import { AgentBrowserChat } from "./agent-browser-chat";

type Mode = "manual" | "agent";

export function AgentBrowserShell() {
	const [mode, setMode] = useState<Mode>("manual");
	const [agentKey, setAgentKey] = useState(0);

	const handleNewSession = useCallback(() => {
		setAgentKey((prev) => prev + 1);
	}, []);

	return (
		<div className="flex h-[calc(100dvh-1px)] flex-col overflow-hidden bg-background">
			{/* Header */}
			<div
				className="flex shrink-0 items-center justify-between border-b border-border px-4"
				style={{ height: 56 }}
			>
				<div className="flex items-center gap-2">
					<GlobeIcon label="" size="small" color={token("color.icon.brand")} />
					<span className="text-text text-sm font-semibold">Agent Browser</span>
				</div>

				<div className="flex items-center gap-2">
					{/* Mode toggle */}
					<div className="flex rounded-lg border border-border bg-surface-raised p-0.5">
						{(["manual", "agent"] as const).map((m) => (
							<button
								key={m}
								type="button"
								onClick={() => setMode(m)}
								className={cn(
									"rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
									mode === m
										? "bg-background text-text shadow-sm"
										: "text-text-subtle hover:text-text",
								)}
							>
								{m}
							</button>
						))}
					</div>

					{/* New session button (agent mode only) */}
					{mode === "agent" ? (
						<button
							type="button"
							onClick={handleNewSession}
							className="text-text-subtle hover:text-text border-border hover:bg-surface-raised rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
						>
							New session
						</button>
					) : null}
				</div>
			</div>

			{/* Content */}
			<div className="min-h-0 flex-1">
				{mode === "manual" ? (
					<ManualBrowser />
				) : (
					<AgentBrowserChat key={agentKey} />
				)}
			</div>
		</div>
	);
}
