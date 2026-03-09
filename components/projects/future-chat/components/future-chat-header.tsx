"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	getFutureChatPrimaryArtifact,
	sortFutureChatArtifacts,
} from "@/components/projects/future-chat/lib/future-chat-artifacts";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { FutureChatDocument, FutureChatVisibility } from "@/lib/future-chat-types";
import { getMessageArtifactResult, type RovoUIMessage } from "@/lib/rovo-ui-messages";
import { FileTextIcon, GlobeIcon, LockIcon, MessageSquarePlusIcon } from "lucide-react";

interface FutureChatHeaderProps {
	activeArtifactId: string | null;
	artifacts: ReadonlyArray<FutureChatDocument>;
	messages: ReadonlyArray<RovoUIMessage>;
	onNewChat: () => void;
	onOpenArtifact: (documentId: string) => void;
	onSelectVisibility: (visibility: FutureChatVisibility) => void;
	threadCount: number;
	visibility: FutureChatVisibility;
}

export function FutureChatHeader({
	activeArtifactId,
	artifacts,
	messages,
	onNewChat,
	onOpenArtifact,
	onSelectVisibility,
	threadCount,
	visibility,
}: Readonly<FutureChatHeaderProps>) {
	const { open } = useSidebar();
	const primaryArtifact = getFutureChatPrimaryArtifact(artifacts, activeArtifactId);
	const sortedArtifacts = sortFutureChatArtifacts(artifacts);
	const artifactMenuItems = (() => {
		const items = sortedArtifacts.map((artifact) => ({
			id: artifact.id,
			kind: artifact.kind,
			title: artifact.title,
		}));
		const seenIds = new Set(items.map((item) => item.id));

		for (let index = messages.length - 1; index >= 0; index--) {
			const artifactResult = getMessageArtifactResult(messages[index]);
			if (!artifactResult || seenIds.has(artifactResult.documentId)) {
				continue;
			}

			seenIds.add(artifactResult.documentId);
			items.push({
				id: artifactResult.documentId,
				kind: artifactResult.kind,
				title: artifactResult.title,
			});
		}

		return items;
	})();

	return (
		<header className="sticky top-0 z-20 flex items-center gap-2 border-border/80 border-b bg-background/85 px-2 py-2 backdrop-blur md:px-4">
			<SidebarTrigger className="-ml-1 size-8" variant="ghost" />

			<div className="min-w-0">
				<p className="truncate font-medium text-sm">Future Chat</p>
				<p className="hidden truncate text-text-subtle text-xs sm:block">
					{threadCount}
					{" saved "}
					{threadCount === 1 ? "thread" : "threads"}
				</p>
			</div>

			<div className="ml-auto flex items-center gap-2">
				{primaryArtifact || artifactMenuItems.length > 0 ? (
					<DropdownMenu>
						<DropdownMenuTrigger
							render={(
								<Button
									className="h-8 max-w-[13rem] gap-2 px-2 sm:max-w-[16rem]"
									type="button"
									variant="outline"
								/>
							)}
						>
							<FileTextIcon className="size-4" />
							<span className="truncate">Artifacts</span>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuGroup>
								<DropdownMenuLabel>
									{artifactMenuItems.length === 1 ? "Saved artifact" : `${artifactMenuItems.length} saved artifacts`}
								</DropdownMenuLabel>
								{artifactMenuItems.map((artifact) => (
									<DropdownMenuItem
										onClick={() => onOpenArtifact(artifact.id)}
										description={artifact.kind}
										key={artifact.id}
									>
										{artifact.title}
									</DropdownMenuItem>
								))}
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				) : null}

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
			</div>

			<Button
				className="hidden h-8 px-2 lg:flex"
				nativeButton={false}
				render={(
					<Link
						href="https://github.com/vercel/chatbot"
						rel="noreferrer"
						target="_blank"
					/>
				)}
				variant="ghost"
			>
				Original repo
			</Button>
		</header>
	);
}
