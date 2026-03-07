"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { FutureChatVisibility } from "@/lib/future-chat-types";
import { GlobeIcon, LockIcon, MessageSquarePlusIcon } from "lucide-react";

interface FutureChatHeaderProps {
	onNewChat: () => void;
	onSelectVisibility: (visibility: FutureChatVisibility) => void;
	visibility: FutureChatVisibility;
}

export function FutureChatHeader({
	onNewChat,
	onSelectVisibility,
	visibility,
}: Readonly<FutureChatHeaderProps>) {
	const { open } = useSidebar();

	return (
		<header className="sticky top-0 z-20 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
			<SidebarTrigger className="-ml-1" />

			<Button
				className={cn("h-8 px-2", open ? "md:hidden" : "")}
				onClick={onNewChat}
				type="button"
				variant="outline"
			>
					<MessageSquarePlusIcon className="size-4" />
				<span className="md:sr-only">New chat</span>
			</Button>

			<DropdownMenu>
				<DropdownMenuTrigger
					render={(
						<Button className="h-8 px-2" type="button" variant="outline" />
					)}
				>
					{visibility === "public" ? (
						<GlobeIcon className="size-4" />
					) : (
						<LockIcon className="size-4" />
					)}
					<span className="hidden sm:inline">
						{visibility === "public" ? "Public" : "Private"}
					</span>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					<DropdownMenuItem onSelect={() => onSelectVisibility("private")}>
						<LockIcon className="mr-2 size-4" />
						Private draft
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={() => onSelectVisibility("public")}>
						<GlobeIcon className="mr-2 size-4" />
						Public link
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Button
				className="ml-auto hidden h-8 bg-zinc-900 px-2 text-zinc-50 hover:bg-zinc-800 md:flex dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
				nativeButton={false}
				render={(
					<Link
						href="https://github.com/vercel/chatbot"
						rel="noreferrer"
						target="_blank"
					/>
				)}
			>
				Original repo
			</Button>
		</header>
	);
}
