"use client";

import { RovoChatProvider } from "@/app/contexts";
import ChatPanel from "@/components/templates/sidebar-chat/page";

const PORT_COUNT = 3;

export default function MultiportsDemo(): React.ReactElement {
	return (
		<div className="mx-auto flex min-h-[500px] justify-center gap-12">
			{Array.from({ length: PORT_COUNT }, (_, i) => (
				<RovoChatProvider key={i}>
					<ChatPanel onClose={() => {}} />
				</RovoChatProvider>
			))}
		</div>
	);
}
