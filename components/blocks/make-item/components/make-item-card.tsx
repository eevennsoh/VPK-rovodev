import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/ui/card";
import { Lozenge } from "@/components/ui/lozenge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import EditIcon from "@atlaskit/icon/core/edit";
import ShareIcon from "@atlaskit/icon/core/share";
import { AvatarGroup, Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { AnimatedAscii } from "@/components/blocks/discovery-gallery/animated-ascii";
import StarStarredIcon from "@atlaskit/icon/core/star-starred";
import type { MakeItem } from "../lib/types";

interface MakeItemCardProps {
	item: MakeItem;
	className?: string;
	onRecurringToggle?: (enabled: boolean) => void;
}

export function MakeItemCard({ item, className, onRecurringToggle }: Readonly<MakeItemCardProps>) {
	return (
		<Card className={cn("flex flex-row overflow-hidden border border-border bg-surface py-0 shadow-none transition-all duration-200 ease-out hover:-translate-y-1 hover:border-transparent hover:shadow-2xl", className)}>
			{/* Left: ASCII Preview */}
			<div className="relative flex w-[280px] shrink-0 items-center justify-center bg-surface overflow-hidden">
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-80 scale-90">
					<AnimatedAscii
						id={item.id}
						type={item.type}
						ascii={item.ascii}
						color={item.color}
					/>
				</div>
			</div>

			{/* Right: Details */}
			<div className="flex flex-1 flex-col justify-between pt-4">
				<CardHeader className="pb-0">
					<Lozenge variant={item.type === "apps" ? "information" : item.type === "agents" ? "discovery" : item.type === "skills" ? "success" : "warning"}>
						{item.type === "apps" ? "App" : item.type === "agents" ? "Agent" : item.type === "skills" ? "Skill" : "Automation"}
					</Lozenge>
					<CardAction>
						<div className="flex items-center gap-1">
							{item.recurring ? (
								<Switch
									checked={item.recurring.enabled}
									onCheckedChange={onRecurringToggle}
									aria-label="Toggle recurring schedule"
								/>
							) : null}
							<Button variant="ghost" size="icon-sm" aria-label="Edit" className="text-icon-subtle">
								<EditIcon label="" size="small" />
							</Button>
							<Button variant="ghost" size="icon-sm" aria-label="Share" className="text-icon-subtle">
								<ShareIcon label="" size="small" />
							</Button>
						</div>
					</CardAction>
				</CardHeader>

				<CardContent className="flex-1 pt-2 pb-0">
					<CardTitle className="text-base leading-5 font-semibold mb-1">{item.title}</CardTitle>
					{item.recurring ? (
						<p className={cn(
							"mb-1 flex items-center gap-1.5 text-xs leading-4",
							item.recurring.enabled ? "text-text-subtle" : "text-text-disabled",
						)}>
							<span>{item.recurring.runs} {item.recurring.runs === 1 ? "run" : "runs"}</span>
							<span className="text-text-subtlest">•</span>
							<span>🔄 {item.recurring.schedule}</span>
						</p>
					) : null}
					<CardDescription className="text-sm leading-5 text-text-subtle">
						{item.description}
					</CardDescription>
				</CardContent>

				<CardFooter className="items-center justify-between bg-transparent rounded-none px-0 mx-4">
					<div className="flex items-center gap-6">
						<div className="flex flex-col gap-0.5">
							<span className="text-xs leading-4 text-text-subtlest">Last updated</span>
							<span className="text-xs leading-4 font-medium text-text">{item.lastUpdated}</span>
						</div>
						<div className="flex flex-col gap-0.5">
							<span className="text-xs leading-4 text-text-subtlest">Users</span>
							<span className="text-xs leading-4 font-medium text-text">{item.users.toLocaleString()}</span>
						</div>
						<div className="flex flex-col gap-0.5">
							<span className="text-xs leading-4 text-text-subtlest">Rating</span>
							<div className="flex items-center gap-1">
								<span className="text-xs leading-4 font-medium text-text">{item.rating.toFixed(1)}</span>
								<Icon
									render={<StarStarredIcon label="" size="small" color="currentColor" />}
									label="Star"
									className="text-warning size-3"
								/>
								<span className="text-xs leading-4 text-text-subtlest">({item.ratingCount})</span>
							</div>
						</div>
					</div>

					<div className="flex flex-col items-end gap-0.5">
						<span className="text-xs leading-4 text-text-subtlest">Maintained by</span>
						<AvatarGroup>
							{item.maintainers.slice(0, 4).map((maintainer, i) => (
								<Avatar key={i} size="xs">
									<AvatarFallback>{maintainer.name.charAt(0).toUpperCase()}</AvatarFallback>
								</Avatar>
							))}
						</AvatarGroup>
					</div>
				</CardFooter>
			</div>
		</Card>
	);
}
