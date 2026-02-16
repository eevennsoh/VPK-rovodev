"use client";

import { token } from "@/lib/tokens";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Heading from "@/components/blocks/shared-ui/heading";
import ExampleCard from "./example-card";
import { CheckboxFilterDropdown } from "./checkbox-filter-dropdown";
import {
	getExamplePrompt,
	PROMPT_GALLERY_ROLE_OPTIONS,
	PROMPT_GALLERY_USE_CASE_OPTIONS,
	type PromptGalleryExample,
} from "../data/examples";
import { useExampleFilters } from "../hooks/use-example-filters";
import animationStyles from "./discover-more-examples.module.css";
import ChevronUpIcon from "@atlaskit/icon/core/chevron-up";
import SearchIcon from "@atlaskit/icon/core/search";

interface DiscoverMoreExamplesProps {
	onExampleClick: (prompt: string) => void;
	onExamplePreviewStart?: (prompt: string) => void;
	onExamplePreviewEnd?: () => void;
	onClose: () => void;
	examples?: readonly PromptGalleryExample[];
	isClosing?: boolean;
}

export default function DiscoverMoreExamples({
	onExampleClick,
	onExamplePreviewStart,
	onExamplePreviewEnd,
	onClose,
	examples,
	isClosing = false,
}: Readonly<DiscoverMoreExamplesProps>) {
	const {
		searchTerm,
		setSearchTerm,
		selectedUseCases,
		selectedRoles,
		filteredExamples,
		toggleUseCase,
		toggleRole,
	} = useExampleFilters(examples);

	return (
		<div className="flex w-full flex-col" style={{ marginTop: token("space.300") }}>
			<div
				className={cn(
					"flex min-h-0 flex-1 flex-col",
					isClosing ? animationStyles.animateOut : animationStyles.animateIn,
				)}
				style={{ gap: token("space.200") }}
			>
				<DiscoverHeader onClose={onClose} />
				<SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
				<div className="flex gap-2 px-2">
					<CheckboxFilterDropdown
						label="Use cases"
						options={PROMPT_GALLERY_USE_CASE_OPTIONS}
						selectedValues={selectedUseCases}
						onToggle={toggleUseCase}
					/>
					<CheckboxFilterDropdown
						label="Roles"
						options={PROMPT_GALLERY_ROLE_OPTIONS}
						selectedValues={selectedRoles}
						onToggle={toggleRole}
					/>
				</div>
				<ExamplesGrid
					examples={filteredExamples}
					onExampleClick={onExampleClick}
					onExamplePreviewStart={onExamplePreviewStart}
					onExamplePreviewEnd={onExamplePreviewEnd}
				/>
			</div>
		</div>
	);
}

interface DiscoverHeaderProps {
	onClose: () => void;
}

function DiscoverHeader({ onClose }: Readonly<DiscoverHeaderProps>) {
	return (
		<div className="flex items-center justify-between px-2">
			<Heading size="medium">Discover more examples</Heading>
			<Button className="gap-2" size="sm" variant="ghost" onClick={onClose}>
				<ChevronUpIcon label="" size="small" />
				Less
			</Button>
		</div>
	);
}

interface SearchBarProps {
	searchTerm: string;
	onSearchChange: (value: string) => void;
}

function SearchBar({ searchTerm, onSearchChange }: Readonly<SearchBarProps>) {
	return (
		<div className="h-8 px-2">
			<div className="relative">
				<span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-icon">
					<SearchIcon label="" size="small" />
				</span>
				<Input
					placeholder="Search"
					value={searchTerm}
					onChange={(event) => onSearchChange(event.currentTarget.value)}
					className="h-8 pl-7 text-sm placeholder:text-sm"
				/>
			</div>
		</div>
	);
}

interface ExamplesGridProps {
	examples: readonly PromptGalleryExample[];
	onExampleClick: (prompt: string) => void;
	onExamplePreviewStart?: (prompt: string) => void;
	onExamplePreviewEnd?: () => void;
}

function ExamplesGrid({
	examples,
	onExampleClick,
	onExamplePreviewStart,
	onExamplePreviewEnd,
}: Readonly<ExamplesGridProps>) {
	return (
		<div className="min-h-0 flex-1 auto-rows-[146px] grid-cols-3 gap-4 overflow-x-hidden overflow-y-auto p-2 pb-6 [scrollbar-width:thin]" style={{ display: "grid" }}>
			{examples.length > 0 ? (
				examples.map((example) => {
					const prompt = getExamplePrompt(example);

					return (
						<ExampleCard
							key={`${example.title}-${example.role}`}
							iconPath={example.iconPath}
							title={example.title}
							description={example.description}
							onClick={() => onExampleClick(prompt)}
							onPreviewStart={() => onExamplePreviewStart?.(prompt)}
							onPreviewEnd={onExamplePreviewEnd}
						/>
					);
				})
			) : (
				<div
					className="col-span-full flex items-center justify-center rounded-lg border border-border bg-surface text-text-subtle"
					style={{ font: token("font.body") }}
				>
					No examples matched your filters.
				</div>
			)}
		</div>
	);
}
