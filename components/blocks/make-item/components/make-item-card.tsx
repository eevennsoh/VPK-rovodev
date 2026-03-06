import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/ui/card";
import { Lozenge } from "@/components/ui/lozenge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import EditIcon from "@atlaskit/icon/core/edit";
import ShareIcon from "@atlaskit/icon/core/share";
import { AvatarGroup, Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";
import { AnimatedAscii } from "@/components/blocks/discovery-gallery/animated-ascii";
import StarStarredIcon from "@atlaskit/icon/core/star-starred";
import type { MakeItem } from "../lib/types";

interface MakeItemCardProps {
	item: MakeItem;
	className?: string;
	onRecurringToggle?: (enabled: boolean) => void;
	onSelect?: () => void;
}

export function MakeItemCard({ item, className, onRecurringToggle, onSelect }: Readonly<MakeItemCardProps>) {
	const isSelectable = typeof onSelect === "function";
	const runStatusLabel =
		item.runMeta?.status === "running"
			? "Running"
			: item.runMeta?.status === "completed"
				? "Completed"
				: null;

	return (
		<Card
			className={cn(
				"flex flex-col overflow-hidden border border-border bg-surface py-0 shadow-none transition-all duration-200 ease-out hover:-translate-y-1 hover:border-transparent hover:shadow-2xl sm:flex-row",
				isSelectable ? "cursor-pointer" : "cursor-default",
				className,
			)}
			onClick={isSelectable ? onSelect : undefined}
			onKeyDown={isSelectable
				? (event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						onSelect();
					}
				}
				: undefined
			}
			role={isSelectable ? "button" : undefined}
			tabIndex={isSelectable ? 0 : undefined}
		>
			{/* ASCII Preview */}
			<div className="relative flex h-40 shrink-0 items-center justify-center overflow-hidden bg-surface sm:h-auto sm:w-[280px]">
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center scale-90 opacity-80">
					<AnimatedAscii
						id={item.id}
						animationId={item.animationId}
						type={item.type}
						ascii={item.ascii}
						color={item.color}
					/>
				</div>
			</div>

			{/* Details */}
			<div className="flex min-w-0 flex-1 flex-col justify-between pt-4">
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
									onClick={(event) => event.stopPropagation()}
									aria-label="Toggle recurring schedule"
								/>
							) : null}
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label="Edit"
								className="text-icon-subtle"
								onClick={(event) => event.stopPropagation()}
							>
								<EditIcon label="" size="small" />
							</Button>
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label="Share"
								className="text-icon-subtle"
								onClick={(event) => event.stopPropagation()}
							>
								<ShareIcon label="" size="small" />
							</Button>
						</div>
					</CardAction>
				</CardHeader>

				<CardContent className="flex-1 pt-2 pb-3">
					<CardTitle className="text-sm leading-5 font-semibold mb-1">{item.title}</CardTitle>
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
					<CardDescription className="text-sm leading-5 text-text-subtle line-clamp-2">
						{item.description}
					</CardDescription>
				</CardContent>

				<CardFooter className="flex-wrap items-center justify-between gap-y-2 bg-transparent rounded-none px-0 mx-4">
					{item.runMeta ? (
						<>
							<div className="flex flex-wrap items-center gap-x-6 gap-y-2">
								<div className="flex flex-col gap-0.5">
									<span className="text-xs leading-4 text-text-subtlest">Last updated</span>
									<span className="text-xs leading-4 font-medium text-text">{item.lastUpdated}</span>
								</div>
								<div className="flex flex-col gap-0.5">
									<span className="text-xs leading-4 text-text-subtlest">Status</span>
									<span className="text-xs leading-4 font-medium text-text">{runStatusLabel}</span>
								</div>
								<div className="flex flex-col gap-0.5">
									<span className="text-xs leading-4 text-text-subtlest">Tasks</span>
									<span className="text-xs leading-4 font-medium text-text">
										{item.runMeta.taskCount.toLocaleString()}
									</span>
								</div>
							</div>

							<div className="flex min-w-0 flex-col items-end gap-0.5">
								{item.runMeta?.status === "running" ? (
									<Spinner size="sm" className="text-icon-subtle" label="Generating plan" />
								) : (
									<>
										<span className="text-xs leading-4 text-text-subtlest">Created by</span>
										<Avatar size="xs">
											{item.maintainers[0]?.src ? (
												<AvatarImage src={item.maintainers[0].src} alt={item.maintainers[0].name} />
											) : null}
											<AvatarFallback>{item.maintainers[0]?.name.charAt(0).toUpperCase()}</AvatarFallback>
										</Avatar>
									</>
								)}
							</div>
						</>
					) : (
						<>
							<div className="flex flex-wrap items-center gap-x-6 gap-y-2">
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
						</>
					)}
				</CardFooter>
			</div>
		</Card>
	);
}
