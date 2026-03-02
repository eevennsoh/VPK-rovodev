import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { token } from "@/lib/tokens";
import { Lozenge } from "@/components/ui/lozenge";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tag, TagGroup } from "@/components/ui/tag";
import { AnimatedAscii } from "./animated-ascii";
import SearchIcon from "@atlaskit/icon/core/search";
import { GALLERY_ITEMS, CATEGORIES, type GalleryItem, type Category } from "@/components/blocks/make-gallery/data/gallery-items";

interface DiscoveryGalleryProps {
	onSelect: (prompt: string) => void;
	onPreviewStart?: (prompt: string) => void;
	onPreviewEnd?: () => void;
	onExpandChange?: (expanded: boolean) => void;
	className?: string;
}

export default function DiscoveryGallery({
	onSelect,
	onPreviewStart,
	onPreviewEnd,
	className,
}: Readonly<DiscoveryGalleryProps>) {
	const [activeCategory, setActiveCategory] = useState<Category>("all");
	const [searchTerm, setSearchTerm] = useState("");
	const activeCategoryLabel =
		CATEGORIES.find((category) => category.value === activeCategory)?.label ??
		"All";
	const searchScopeLabel =
		activeCategory === "all"
			? "all"
			: activeCategoryLabel.toLowerCase();

	const filteredItems = useMemo(() => {
		let items = GALLERY_ITEMS;
		if (activeCategory !== "all") {
			items = items.filter((item) => item.type === activeCategory);
		}
		if (searchTerm.trim()) {
			const query = searchTerm.toLowerCase().trim();
			items = items.filter(
				(item) =>
					item.title.toLowerCase().includes(query) ||
					item.prompt.toLowerCase().includes(query),
			);
		}
		return items;
	}, [activeCategory, searchTerm]);

	const rows: GalleryItem[][] = [];
	for (let i = 0; i < filteredItems.length; i += 2) {
		rows.push(filteredItems.slice(i, i + 2));
	}

	return (
		<div className={cn("flex w-full flex-col", className)} style={{ gap: token("space.200") }}>
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<ToggleGroup
					aria-label="Filter examples by category"
					value={[activeCategory]}
					onValueChange={(newValue: string[]) => {
						if (newValue.length > 0) {
							setActiveCategory(newValue[0] as Category);
						}
					}}
					spacing={1}
				>
					{CATEGORIES.map((cat) => (
						<ToggleGroupItem key={cat.value} value={cat.value}>
							{cat.label}
						</ToggleGroupItem>
					))}
				</ToggleGroup>

				<div className="w-full md:w-[240px]">
					<InputGroup>
						<InputGroupAddon align="inline-start">
							<SearchIcon label="" size="small" />
						</InputGroupAddon>
						<InputGroupInput
							aria-label={`Search ${searchScopeLabel}`}
							placeholder={`Search ${searchScopeLabel}`}
							value={searchTerm}
							onChange={(event) => setSearchTerm(event.currentTarget.value)}
						/>
					</InputGroup>
				</div>
			</div>

			<div className="flex flex-col gap-4">
				{rows.length > 0 ? (
					rows.map((row, rowIndex) => (
						<div key={rowIndex} className="flex flex-col gap-4 md:flex-row">
							{row.map((item) => (
								<motion.button
									key={item.id}
									type="button"
									initial="rest"
									whileHover="hover"
									whileFocus="hover"
									className="group relative flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised p-6 text-left shadow-none transition-all duration-200 ease-out hover:-translate-y-1 hover:border-transparent hover:shadow-2xl focus-visible:-translate-y-1 focus-visible:border-transparent focus-visible:shadow-2xl focus-visible:outline-2 focus-visible:outline-border-focused"
									onClick={() => onSelect(item.prompt)}
									onMouseEnter={() => onPreviewStart?.(item.prompt)}
									onMouseLeave={() => onPreviewEnd?.()}
								>
									<div className="relative z-10 mb-6 flex w-full items-center justify-between">
										<h3 className="text-[13px] font-semibold leading-4 tracking-[-0.01em] text-text">
											{item.title}
										</h3>
									<Lozenge variant={item.type === "apps" ? "information" : item.type === "agents" ? "discovery" : item.type === "skills" ? "success" : "warning"}>
										{item.type === "apps" ? "App" : item.type === "agents" ? "Agent" : item.type === "skills" ? "Skill" : "Automation"}
									</Lozenge>
									</div>
									<div className="relative flex min-h-[220px] w-full flex-1 items-center justify-center overflow-hidden">
										{/* ASCII Art */}
										<motion.div
											variants={{
												rest: { 
													opacity: 1, 
													scale: 1, 
													filter: "blur(0px)",
													y: 0
												},
												hover: { 
													opacity: 0.15, 
													scale: 0.9, 
													filter: "blur(2px)",
													y: -20
												},
											}}
											transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
											className="absolute inset-0 flex items-center justify-center pointer-events-none"
										>
											<AnimatedAscii 
												id={item.id} 
												type={item.type} 
												ascii={item.ascii} 
												color={item.color} 
											/>
										</motion.div>

										{/* Info Overlay */}
										<motion.div
											variants={{
												rest: { opacity: 0, y: 20, filter: "blur(4px)" },
												hover: { opacity: 1, y: 0, filter: "blur(0px)" },
											}}
											transition={{ duration: 0.4, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
											className="absolute inset-0 flex flex-col justify-center gap-5 py-2 pointer-events-none"
										>
											<p className="text-[13px] leading-relaxed text-text font-medium">
												{item.description}
											</p>
											<div className="flex w-full flex-col">
											{item.metadata.map((meta, i) => (
												<div key={i} className="flex min-h-[32px] items-center justify-between border-b border-border/50 py-2 text-xs last:border-0">
													<span className="text-text-subtle">{meta.label}</span>
													{Array.isArray(meta.value) ? (
														<TagGroup className="justify-end gap-1 max-w-[70%]">
															{meta.value.map((val, idx) => (
																<Tag key={idx}>{val}</Tag>
															))}
														</TagGroup>
													) : (
														<span className="font-medium text-text">
															{meta.value}
														</span>
													)}
												</div>
											))}
											</div>
										</motion.div>
									</div>
								</motion.button>
							))}
						</div>
					))
				) : (
					<div
						className="flex items-center justify-center rounded-lg border border-border bg-surface py-12 text-text-subtle"
						style={{ font: token("font.body") }}
					>
						No items matched your search.
					</div>
				)}
			</div>
		</div>
	);
}
