"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AddIcon from "@atlaskit/icon/core/add";
import AppIcon from "@atlaskit/icon/core/app";
import BugIcon from "@atlaskit/icon/core/bug";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import CrossIcon from "@atlaskit/icon/core/cross";
import DeleteIcon from "@atlaskit/icon/core/delete";
import EditIcon from "@atlaskit/icon/core/edit";
import FeedbackIcon from "@atlaskit/icon/core/feedback";
import MenuIcon from "@atlaskit/icon/core/menu";
import QuestionCircleIcon from "@atlaskit/icon/core/question-circle";
import ShowMoreHorizontalIcon from "@atlaskit/icon/core/show-more-horizontal";
import SkillIcon from "@atlaskit/icon/core/ai-agent";
import SmartLinkEmbedIcon from "@atlaskit/icon/core/smart-link-embed";

interface ChatHeaderProps {
	onClose?: () => void;
}

export default function ChatHeader({ onClose }: Readonly<ChatHeaderProps>) {
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

	// No-op handlers for visual-only buttons
	const noop = () => {};

	return (
		<div className="py-3 px-3">
			<div className="flex justify-between items-center">
				{/* Left side: Menu icon and Title */}
				<div className="flex items-center gap-1">
						<Button aria-label="Menu" size="icon" variant="ghost" onClick={noop}>
							<MenuIcon label="" />
						</Button>
						<div className="flex items-center gap-2">
							<Image
								src="/1p/rovo.svg"
								alt="VPK logo"
								width={16}
								height={16}
							/>
							<div className="flex items-center gap-1">
								<span className="text-sm font-semibold text-text">
								Rovo
							</span>
							<ChevronDownIcon label="Expand menu" size="small" />
						</div>
					</div>
				</div>

				{/* Right side: Chat actions */}
				<div className="flex items-center gap-1">
					<Button aria-label="New chat" size="icon" variant="ghost" onClick={noop}>
						<EditIcon label="" />
					</Button>
					<Button aria-label="Switch view" size="icon" variant="ghost" onClick={noop}>
						<SmartLinkEmbedIcon label="" />
					</Button>
					<div style={{ position: "relative", overflow: "visible" }}>
						<DropdownMenu open={isMoreMenuOpen} onOpenChange={setIsMoreMenuOpen}>
							<DropdownMenuTrigger
								aria-label="More"
								className={`inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 rounded-md size-8 ${isMoreMenuOpen ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : "hover:bg-accent hover:text-accent-foreground"}`}
							>
								<ShowMoreHorizontalIcon label="" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" sideOffset={4}>
								<DropdownMenuGroup>
									<DropdownMenuItem onSelect={() => setIsMoreMenuOpen(false)}>
										<EditIcon label="" />
										Rename
									</DropdownMenuItem>
									<DropdownMenuItem onSelect={() => setIsMoreMenuOpen(false)}>
										<DeleteIcon label="" />
										Delete
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuItem onSelect={() => setIsMoreMenuOpen(false)}>
										<AppIcon label="" />
										Chrome extension
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuItem onSelect={() => setIsMoreMenuOpen(false)}>
										<FeedbackIcon label="" />
										Feedback
									</DropdownMenuItem>
									<DropdownMenuItem onSelect={() => setIsMoreMenuOpen(false)}>
										<BugIcon label="" />
										Debug
									</DropdownMenuItem>
									<DropdownMenuItem onSelect={() => setIsMoreMenuOpen(false)}>
										<QuestionCircleIcon label="" />
										Get help
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuItem onSelect={() => setIsMoreMenuOpen(false)}>
										<AddIcon label="" />
										Create skill
									</DropdownMenuItem>
									<DropdownMenuItem onSelect={() => setIsMoreMenuOpen(false)}>
										<SkillIcon label="" />
										View all skills
									</DropdownMenuItem>
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
					<Button aria-label="Close" size="icon" variant="ghost" onClick={onClose ?? noop}>
						<CrossIcon label="" />
					</Button>
				</div>
			</div>
		</div>
	);
}
