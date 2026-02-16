"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import DiscoverMoreExamples from "./components/discover-more-examples";
import { DEFAULT_PROMPT_GALLERY_EXAMPLES, type PromptGalleryExample } from "./data/examples";
import {
	DEFAULT_PROMPT_GALLERY_SUGGESTIONS,
	type PromptGallerySuggestion,
} from "./data/suggestions";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";

interface PromptGalleryProps {
	items?: readonly PromptGallerySuggestion[];
	examples?: readonly PromptGalleryExample[];
	onSelect: (prompt: string) => void;
	onPreviewStart?: (prompt: string) => void;
	onPreviewEnd?: () => void;
	showMore?: boolean;
	moreLabel?: string;
	className?: string;
}

function getSuggestionPrompt(suggestion: PromptGallerySuggestion): string {
	return suggestion.prompt ?? suggestion.label;
}

export default function PromptGallery({
	items = DEFAULT_PROMPT_GALLERY_SUGGESTIONS,
	examples = DEFAULT_PROMPT_GALLERY_EXAMPLES,
	onSelect,
	onPreviewStart,
	onPreviewEnd,
	showMore = true,
	moreLabel = "More",
	className,
}: Readonly<PromptGalleryProps>) {
	const [showMoreSection, setShowMoreSection] = useState(false);
	const [isClosingMore, setIsClosingMore] = useState(false);

	const closeMoreSection = () => {
		setIsClosingMore(true);

		setTimeout(() => {
			setShowMoreSection(false);
			setIsClosingMore(false);
		}, 350);
	};

	return (
		<div className={cn("w-full", className)}>
			{showMoreSection ? (
				<DiscoverMoreExamples
					examples={examples}
					onExampleClick={onSelect}
					onExamplePreviewStart={onPreviewStart}
					onExamplePreviewEnd={onPreviewEnd}
					onClose={closeMoreSection}
					isClosing={isClosingMore}
				/>
			) : (
				<div className="flex flex-wrap justify-center gap-2">
					{items.map((suggestion) => {
						const Icon = suggestion.icon;
						const suggestionPrompt = getSuggestionPrompt(suggestion);

						return (
							<Button
								key={suggestion.label}
								className="gap-2 rounded-full"
								variant="secondary"
								onClick={() => onSelect(suggestionPrompt)}
								onMouseEnter={() => onPreviewStart?.(suggestionPrompt)}
								onMouseLeave={() => onPreviewEnd?.()}
								onFocus={() => onPreviewStart?.(suggestionPrompt)}
								onBlur={() => onPreviewEnd?.()}
							>
								<Icon label="" size="small" />
								{suggestion.label}
							</Button>
						);
					})}
					{showMore ? (
						<Button
							className="gap-2 rounded-full"
							variant="secondary"
							onClick={() => setShowMoreSection(true)}
						>
							<ChevronDownIcon label="" size="small" />
							{moreLabel}
						</Button>
					) : null}
				</div>
			)}
		</div>
	);
}
