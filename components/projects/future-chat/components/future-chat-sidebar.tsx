"use client";

import { formatDistanceToNowStrict, isToday, isYesterday, subMonths, subWeeks } from "date-fns";
import Link from "next/link";
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
	SidebarSeparator,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import type { FutureChatThread } from "@/lib/future-chat-types";
import {
	ChevronRightIcon,
	MoreHorizontalIcon,
	MessageSquarePlusIcon,
	Trash2Icon,
} from "lucide-react";

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
				className="h-auto min-h-12 items-start rounded-lg px-2.5 py-2.5"
				isActive={isActive}
				onClick={() => {
					setOpenMobile(false);
					void onSelectThread(thread.id);
				}}
				size="lg"
				type="button"
			>
				<div className="min-w-0 flex-1">
					<div className="truncate text-sm leading-5">{thread.title}</div>
					<div className="mt-1 flex items-center gap-1 text-[11px] text-sidebar-foreground/60">
						<span>{formatDistanceToNowStrict(new Date(thread.updatedAt), { addSuffix: true })}</span>
						{isActive ? (
							<>
								<span aria-hidden="true">•</span>
								<span>Open</span>
							</>
						) : null}
					</div>
				</div>
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
		{ label: "Last 7 days", threads: groupedThreads.lastWeek },
		{ label: "Last 30 days", threads: groupedThreads.lastMonth },
		{ label: "Older", threads: groupedThreads.older },
	];

	return (
		<Sidebar
			aria-label="Future Chat threads"
			className="group-data-[side=left]:border-r-0"
			role="complementary"
			variant="inset"
		>
			<SidebarHeader className="gap-3 border-border/70 border-b bg-sidebar/95 backdrop-blur">
				<div className="flex items-center justify-between gap-3">
					<div className="min-w-0">
						<p className="font-medium text-sm">Future Chat</p>
						<p className="truncate text-sidebar-foreground/60 text-xs">
							Vercel-style shell on the existing VPK runtime
						</p>
					</div>
					<Button
						aria-label="Delete all chats"
						className="size-8"
						onClick={() => void onDeleteAll()}
						size="icon-sm"
						type="button"
						variant="ghost"
					>
						<Trash2Icon className="size-4" />
					</Button>
				</div>

				<Button
					className="w-full justify-start"
					onClick={() => {
						setOpenMobile(false);
						void onNewChat();
					}}
					type="button"
					variant="outline"
				>
					<MessageSquarePlusIcon className="size-4" />
					New chat
				</Button>
			</SidebarHeader>

			<SidebarContent className="bg-sidebar/60">
				{threads.length === 0 ? (
					<SidebarGroup>
						<SidebarGroupContent>
							<div className="rounded-lg border border-dashed border-sidebar-border/80 bg-sidebar-accent/20 px-3 py-4 text-center text-sidebar-foreground/60 text-sm">
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
				<SidebarSeparator />
				<div className="rounded-lg bg-sidebar-accent/30 px-2.5 py-2 text-sidebar-foreground/70 text-xs">
					File-backed local history with thread, vote, and artifact persistence.
				</div>
				<Button
					className="justify-between"
					nativeButton={false}
					render={(
						<Link
							href="https://github.com/vercel/chatbot"
							rel="noreferrer"
							target="_blank"
						/>
					)}
					type="button"
					variant="ghost"
				>
					View source inspiration
					<ChevronRightIcon className="size-4" />
				</Button>
			</SidebarFooter>
		</Sidebar>
	);
}
