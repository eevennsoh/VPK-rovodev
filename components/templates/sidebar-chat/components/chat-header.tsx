"use client";

import { useState } from "react";
import EditIcon from "@atlaskit/icon/core/edit";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChatHeaderProps {
	mode?: "chat" | "terminal";
	onModeChange?: (mode: "chat" | "terminal") => void;
	onNewChat?: () => void;
}

export default function ChatHeader({ mode, onModeChange, onNewChat }: Readonly<ChatHeaderProps>) {
	const [internalMode, setInternalMode] = useState<"chat" | "terminal">("chat");

	const activeMode = mode ?? internalMode;
	const handleModeChange = onModeChange ?? setInternalMode;

	return (
		<div className="py-3 px-3">
			<div className="flex items-center justify-between">
				<Tabs
					value={activeMode}
					onValueChange={(v) => handleModeChange(v as "chat" | "terminal")}
				>
					<TabsList variant="default" className="h-8">
						<TabsTrigger value="chat" className="px-3">
							Chat
						</TabsTrigger>
						<TabsTrigger value="terminal" className="px-3">
							Terminal
						</TabsTrigger>
					</TabsList>
				</Tabs>
				<Button
					aria-label="New chat"
					size="icon"
					variant="ghost"
					className="size-8 text-icon-subtle"
					onClick={onNewChat}
				>
					<EditIcon label="" />
				</Button>
			</div>
		</div>
	);
}
