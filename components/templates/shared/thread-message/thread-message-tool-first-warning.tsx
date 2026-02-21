"use client";

import { use, type ReactNode } from "react";
import { ThreadMessageContext } from "./thread-message-context";

export function ThreadMessageToolFirstWarning(): ReactNode {
	const { hasToolFirstWarning, toolFirstWarning } = use(ThreadMessageContext)!;

	if (!hasToolFirstWarning || !toolFirstWarning) {
		return null;
	}

	return (
		<div className="pt-2">
			<div className="rounded-lg border border-border bg-bg-neutral px-3 py-2">
				<p className="text-xs leading-5 font-medium text-text">
					Integration warning
				</p>
				<p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-text-subtle">
					{toolFirstWarning.message}
				</p>
			</div>
		</div>
	);
}
