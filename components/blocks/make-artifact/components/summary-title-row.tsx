"use client";

import { Button } from "@/components/ui/button";
import { token } from "@/lib/tokens";
import ChevronLeftIcon from "@atlaskit/icon/core/chevron-left";
import ShowMoreHorizontalIcon from "@atlaskit/icon/core/show-more-horizontal";
import ShareIcon from "@atlaskit/icon/core/share";
import { Globe } from "lucide-react";

interface SummaryTitleRowProps {
	title: string;
	onBack?: () => void;
}

export default function SummaryTitleRow({
	title,
	onBack,
}: Readonly<SummaryTitleRowProps>) {
	return (
		<div className="flex h-12 items-center justify-between border-b border-border px-4">
			<div className="flex min-w-0 flex-1 items-center gap-2">
				<Button aria-label="Go back" size="icon-xs" variant="ghost" onClick={onBack}>
					<ChevronLeftIcon label="" size="small" />
				</Button>
				<p style={{ font: token("font.heading.xsmall") }} className="truncate text-text" title={title}>
					{title}
				</p>
			</div>

			<div className="ml-3 flex shrink-0 items-center gap-2">
				<Button aria-label="More options" size="icon" variant="outline">
					<ShowMoreHorizontalIcon label="" />
				</Button>
				<Button variant="outline">
					<ShareIcon label="" />
					Share
				</Button>
				<Button>
					<Globe />
					Publish
				</Button>
			</div>
		</div>
	);
}
