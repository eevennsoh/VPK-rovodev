"use client";

import type { ReactElement } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import CrossIcon from "@atlaskit/icon/core/cross";
import EditIcon from "@atlaskit/icon/core/edit";

interface ChatHeaderProps {
	onClose: () => void;
}

export default function ChatHeader({ onClose }: Readonly<ChatHeaderProps>): ReactElement {
	const noop = () => {};

	return (
		<div className="px-3 py-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Image src="/1p/rovo.svg" alt="Rovo" width={16} height={16} />
					<span className="text-sm font-semibold text-text">Rovo</span>
				</div>

				<div className="flex items-center gap-1">
					<Button aria-label="New chat" size="icon" variant="ghost" onClick={noop}>
						<EditIcon label="" />
					</Button>
					<Button aria-label="Close" size="icon" variant="ghost" onClick={onClose}>
						<CrossIcon label="" />
					</Button>
				</div>
			</div>
		</div>
	);
}
