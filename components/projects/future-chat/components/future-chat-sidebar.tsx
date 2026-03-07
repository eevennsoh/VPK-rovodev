"use client";

import { isToday, isYesterday, subMonths, subWeeks } from "date-fns";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import type { FutureChatThread } from "@/lib/future-chat-types";
import { MoreHorizontalIcon, MessageSquarePlusIcon, Trash2Icon } from "lucide-react";

interface FutureChatSidebarProps {
	activeThreadId: string | null;
	onDeleteAll: () => Promise<void>;
	onDeleteThread: (threadId: string) => Promise<void>;
	onNewChat: () => Promise<void>;
	onSelectThread: (threadId: string) => Promise<void>;
	threads: ReadonlyArray<FutureChatThread>;
}

interface GroupedThreads {
	today: FutureChatThread[];
	yesterday: FutureChatThread[];
	lastWeek: FutureChatThread[];
	lastMonth: FutureChatThread[];
	older: FutureChatThread[];
}

function groupThreadsByDate(threads: ReadonlyArray<FutureChatThread>): GroupedThreads {
	const now = new Date();
	const oneWeekAgo = subWeeks(now, 1);
	const oneMonthAgo = subMonths(now, 1);

	return threads.reduce<GroupedThreads>(
		(groups, thread) => {
			const updatedAt = new Date(thread.updatedAt);
			if (isToday(updatedAt)) {
				groups.today.push(thread);
			} else if (isYesterday(updatedAt)) {
				groups.yesterday.push(thread);
			} else if (updatedAt > oneWeekAgo) {
				groups.lastWeek.push(thread);
			} else if (updatedAt > oneMonthAgo) {
				groups.lastMonth.push(thread);
			} else {
				groups.older.push(thread);
			}
			return groups;
		},
		{
			today: [],
			yesterday: [],
			lastWeek: [],
			lastMonth: [],
			older: [],
		},
	);
}

function FutureChatSidebarItem({
	isActive,
	onDeleteThread,
	onSelectThread,
	thread,
}: Readonly<{
	isActive: boolean;
	onDeleteThread: (threadId: string) => Promise<void>;
	onSelectThread: (threadId: string) => Promise<void>;
	thread: FutureChatThread;
}>) {
	const { setOpenMobile } = useSidebar();

	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				isActive={isActive}
				onClick={() => {
					setOpenMobile(false);
					void onSelectThread(thread.id);
				}}
				type="button"
			>
				<span>{thread.title}</span>
			</SidebarMenuButton>

			<DropdownMenu modal={true}>
				<DropdownMenuTrigger
					render={(
						<SidebarMenuAction
							className="mr-0.5 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
							showOnHover={!isActive}
						>
							<MoreHorizontalIcon className="size-4" />
							<span className="sr-only">More</span>
						</SidebarMenuAction>
					)}
				/>
				<DropdownMenuContent align="end" side="bottom">
					<DropdownMenuItem
						className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive"
						onSelect={() => void onDeleteThread(thread.id)}
					>
						<Trash2Icon className="mr-2 size-4" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</SidebarMenuItem>
	);
}

export function FutureChatSidebar({
	activeThreadId,
	onDeleteAll,
	onDeleteThread,
	onNewChat,
	onSelectThread,
	threads,
}: Readonly<FutureChatSidebarProps>) {
	const { setOpenMobile } = useSidebar();
	const groupedThreads = groupThreadsByDate(threads);
	const groups: Array<{ label: string; threads: FutureChatThread[] }> = [
		{ label: "Today", threads: groupedThreads.today },
		{ label: "Yesterday", threads: groupedThreads.yesterday },
		{ label: "Last week", threads: groupedThreads.lastWeek },
		{ label: "Last month", threads: groupedThreads.lastMonth },
		{ label: "Older", threads: groupedThreads.older },
	];

	return (
		<Sidebar className="group-data-[side=left]:border-r-0">
			<SidebarHeader>
				<SidebarMenu>
					<div className="flex items-center justify-between">
						<button
							className="cursor-pointer rounded-md px-2 font-semibold text-lg transition-colors hover:bg-muted"
							onClick={() => {
								setOpenMobile(false);
								void onNewChat();
							}}
							type="button"
						>
							Future Chat
						</button>
						<div className="flex flex-row gap-1">
							<Button
								aria-label="Delete all chats"
								className="h-8 p-1 md:h-fit md:p-2"
								onClick={() => void onDeleteAll()}
								type="button"
								variant="ghost"
							>
								<Trash2Icon className="size-4" />
							</Button>
							<Button
								aria-label="New chat"
								className="h-8 p-1 md:h-fit md:p-2"
								onClick={() => {
									setOpenMobile(false);
									void onNewChat();
								}}
								type="button"
								variant="ghost"
							>
								<MessageSquarePlusIcon className="size-4" />
							</Button>
						</div>
					</div>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent>
				{threads.length === 0 ? (
					<SidebarGroup>
						<SidebarGroupContent>
							<div className="flex w-full items-center justify-center px-2 text-center text-sidebar-foreground/60 text-sm">
								Your conversations will appear here once you start chatting.
							</div>
						</SidebarGroupContent>
					</SidebarGroup>
				) : (
					groups.map((group) => {
						if (group.threads.length === 0) {
							return null;
						}

						return (
							<SidebarGroup key={group.label} className="pb-0">
								<SidebarGroupLabel>{group.label}</SidebarGroupLabel>
								<SidebarGroupContent>
									<SidebarMenu>
										{group.threads.map((thread) => (
											<FutureChatSidebarItem
												isActive={thread.id === activeThreadId}
												key={thread.id}
												onDeleteThread={onDeleteThread}
												onSelectThread={onSelectThread}
												thread={thread}
											/>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
						);
					})
				)}
			</SidebarContent>

			<SidebarFooter>
				<div className="px-2 text-sidebar-foreground/50 text-xs">
					Local prototype history
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}
