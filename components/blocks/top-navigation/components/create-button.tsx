"use client";

import { Button } from "@/components/ui/button";
import AddIcon from "@atlaskit/icon/core/add";

interface CreateButtonProps {
	windowWidth: number;
}

export function CreateButton({ windowWidth }: Readonly<CreateButtonProps>) {
	if (windowWidth >= 768) {
		return (
			<Button className="gap-2" variant="default">
				<AddIcon label="" size="small" />
				Create
			</Button>
		);
	}

	return (
		<Button aria-label="Create" size="icon" variant="default">
			<AddIcon label="" />
		</Button>
	);
}
