"use client";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	getFutureChatPrimaryArtifact,
	sortFutureChatArtifacts,
} from "@/components/projects/future-chat/lib/future-chat-artifacts";
import type { FutureChatDocument } from "@/lib/future-chat-types";
import { getMessageArtifactResult, type RovoUIMessage } from "@/lib/rovo-ui-messages";
import { FileTextIcon } from "lucide-react";

interface FutureChatHeaderProps {
	activeArtifactId: string | null;
	artifacts: ReadonlyArray<FutureChatDocument>;
	messages: ReadonlyArray<RovoUIMessage>;
	onOpenArtifact: (documentId: string) => void;
}

export function FutureChatHeader({
	activeArtifactId,
	artifacts,
	messages,
	onOpenArtifact,
}: Readonly<FutureChatHeaderProps>) {
	const primaryArtifact = getFutureChatPrimaryArtifact(artifacts, activeArtifactId);
	const sortedArtifacts = sortFutureChatArtifacts(artifacts);
	const artifactMenuItems = (() => {
		const items = sortedArtifacts.map((artifact) => ({
			id: artifact.id,
			kind: artifact.kind,
			title: artifact.title,
		}));
		const seenIds = new Set(items.map((item) => item.id));

		for (let index = messages.length - 1; index >= 0; index--) {
			const artifactResult = getMessageArtifactResult(messages[index]);
			if (!artifactResult || seenIds.has(artifactResult.documentId)) {
				continue;
			}

			seenIds.add(artifactResult.documentId);
			items.push({
				id: artifactResult.documentId,
				kind: artifactResult.kind,
				title: artifactResult.title,
			});
		}

		return items;
	})();

	return (
		<header className="sticky top-0 z-20 flex items-center gap-2 border-border/80 border-b bg-background/85 px-2 py-2 backdrop-blur md:px-4">
			<div className="ml-auto flex items-center gap-2">
				{primaryArtifact || artifactMenuItems.length > 0 ? (
					<DropdownMenu>
						<DropdownMenuTrigger
							render={(
								<Button
									className="h-8 max-w-[13rem] gap-2 px-2 sm:max-w-[16rem]"
									type="button"
									variant="outline"
								/>
							)}
						>
							<FileTextIcon className="size-4" />
							<span className="truncate">Artifacts</span>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuGroup>
								<DropdownMenuLabel>
									{artifactMenuItems.length === 1 ? "Saved artifact" : `${artifactMenuItems.length} saved artifacts`}
								</DropdownMenuLabel>
								{artifactMenuItems.map((artifact) => (
									<DropdownMenuItem
										onClick={() => onOpenArtifact(artifact.id)}
										description={artifact.kind}
										key={artifact.id}
									>
										{artifact.title}
									</DropdownMenuItem>
								))}
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				) : null}
			</div>
		</header>
	);
}
