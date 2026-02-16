"use client";

import DeleteIcon from "@atlaskit/icon/core/delete";
import { Button } from "@/components/ui/button";
import { Shimmer } from "@/components/ui-ai/shimmer";
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
	pendingChatId?: string | null;
	onSelectChat: (id: string) => void;
	onDeleteChat: (id: string) => void;
}

export default function SidebarChatHistory({
	items,
	activeChatId,
	isGeneratingTitle = false,
	pendingChatId = null,
	onSelectChat,
	onDeleteChat,
}: Readonly<SidebarChatHistoryProps>) {
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
					{isGeneratingTitle && items.length === 0 ? (
						<div
							className="flex h-10 items-center rounded-xl px-4"
							style={{ font: token("font.heading.xsmall") }}
							aria-label="Generating chat title"
						>
							<Shimmer
								as="span"
								duration={1}
								className="max-w-full truncate motion-safe:animate-[sd-blurIn_160ms_ease-out_both] motion-reduce:animate-none"
							>
								Generating chat title
							</Shimmer>
						</div>
					) : null}
					{items.map((item) => (
						<ChatHistoryRow
							key={item.id}
							item={item}
							isActive={activeChatId === item.id}
							isPendingTitle={isGeneratingTitle && pendingChatId === item.id}
							onSelectChat={onSelectChat}
							onDeleteChat={onDeleteChat}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

interface ChatHistoryRowProps {
	item: ChatHistoryItem;
	isActive: boolean;
	isPendingTitle: boolean;
	onSelectChat: (id: string) => void;
	onDeleteChat: (id: string) => void;
}

function ChatHistoryRow({
	item,
	isActive,
	isPendingTitle,
	onSelectChat,
	onDeleteChat,
}: Readonly<ChatHistoryRowProps>) {
	return (
		<div
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
				isActive ? "bg-bg-neutral" : "hover:bg-bg-neutral-subtle-hovered",
			)}
		>
			<div style={{ font: token("font.heading.xsmall") }} className="min-w-0 flex-1">
				{isPendingTitle ? (
					<Shimmer
						key={`${item.id}:${item.title}`}
						as="span"
						duration={1}
						className="max-w-full truncate motion-safe:animate-[sd-blurIn_160ms_ease-out_both] motion-reduce:animate-none"
					>
						{item.title}
					</Shimmer>
				) : (
					<span
						key={`${item.id}:${item.title}`}
						className="block truncate text-text motion-safe:animate-[sd-blurIn_160ms_ease-out_both] motion-reduce:animate-none"
					>
						{item.title}
					</span>
				)}
			</div>
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
	);
}
