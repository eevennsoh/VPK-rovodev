"use client";

import DeleteIcon from "@atlaskit/icon/core/delete";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import SearchIcon from "@atlaskit/icon/core/search";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { token } from "@/lib/tokens";
import { cn } from "@/lib/utils";

export interface ChatHistoryItem {
	id: string;
	title: string;
}

interface SidebarChatHistoryProps {
	items: ChatHistoryItem[];
	activeChatId: string | null;
	isGeneratingTitle?: boolean;
	onSelectChat: (id: string) => void;
	onDeleteChat: (id: string) => void;
}

export default function SidebarChatHistory({ items, activeChatId, isGeneratingTitle = false, onSelectChat, onDeleteChat }: Readonly<SidebarChatHistoryProps>) {
	return (
		<div className="flex w-full flex-col">
			<div className="p-3">
				<InputGroup>
					<InputGroupAddon>
						<SearchIcon label="Search" />
					</InputGroupAddon>
					<InputGroupInput placeholder="Search" aria-label="Search" />
				</InputGroup>
			</div>
			<div className="flex flex-col px-3">
				<div className="px-1.5 py-2">
					<span style={{ font: token("font.heading.xxsmall") }} className="text-text-subtlest">
						Chat
					</span>
				</div>
				<div className="flex flex-col">
					{isGeneratingTitle ? (
						<Skeleton
							className="h-10 w-full rounded-xl"
							aria-label="Generating chat title"
						/>
					) : null}
					{items.map((item) => (
						<div
							key={item.id}
							role="button"
							tabIndex={0}
							onClick={() => onSelectChat(item.id)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									onSelectChat(item.id);
								}
							}}
							className={cn(
								"group/chat relative flex h-10 cursor-pointer items-center rounded-xl px-4 text-left transition-colors duration-[var(--duration-fast)] ease-out hover:pr-9",
								activeChatId === item.id ? "bg-bg-neutral" : "hover:bg-bg-neutral-subtle-hovered",
							)}
						>
							<span
								style={{ font: token("font.heading.xsmall") }}
								className="truncate text-text motion-safe:animate-[sd-blurIn_220ms_ease-out_both] motion-reduce:animate-none"
							>
								{item.title}
							</span>
							<span className="absolute right-2 hidden group-hover/chat:block" onClick={(e) => e.stopPropagation()} role="presentation">
								<Button
									aria-label="Delete chat"
									variant="ghost"
									size="icon-sm"
									className="cursor-pointer rounded-full text-icon-subtle [&_svg]:size-3"
									onClick={() => onDeleteChat(item.id)}
								>
									<DeleteIcon size="small" label="" />
								</Button>
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
