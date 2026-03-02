"use client";

import DeleteIcon from "@atlaskit/icon/core/delete";
import { Button } from "@/components/ui/button";
import { Shimmer } from "@/components/ui-ai/shimmer";
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
	sectionLabel?: string;
	onSelectChat: (id: string) => void;
	onDeleteChat: (id: string) => void;
}

export default function SidebarChatHistory({
	items,
	activeChatId,
	isGeneratingTitle = false,
	pendingChatId = null,
	sectionLabel,
	onSelectChat,
	onDeleteChat,
}: Readonly<SidebarChatHistoryProps>) {
	return (
		<div className="flex w-full flex-col">
			<div className="flex flex-col px-3">
				{sectionLabel ? (
					<div className="px-1.5 py-2">
						<span style={{ font: token("font.heading.xxsmall") }} className="text-text-subtlest">
							{sectionLabel}
						</span>
					</div>
				) : null}
				<div className="flex flex-col">
					{isGeneratingTitle && items.length === 0 ? (
						<div
							className="flex h-10 items-center rounded-xl px-4"
							style={{ font: token("font.heading.xsmall") }}
							aria-label="Generating chat title"
						>
							<div className="min-w-0 flex flex-1 items-center">
								<Shimmer
									as="span"
									duration={1}
									className="block max-w-full truncate motion-safe:animate-[sd-blurIn_160ms_ease-out_both] motion-reduce:animate-none"
								>
									Generating chat title
								</Shimmer>
							</div>
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
			<div style={{ fontWeight: token("font.weight.semibold") }} className="min-w-0 flex flex-1 items-center text-sm">
				{isPendingTitle ? (
					<Shimmer
						key={`${item.id}:${item.title}`}
						as="span"
						duration={1}
						className="block max-w-full truncate motion-safe:animate-[sd-blurIn_160ms_ease-out_both] motion-reduce:animate-none"
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
