"use client";

import { RovoChatProvider } from "@/app/contexts";
import ChatPanel from "@/components/templates/sidebar-chat/page";

const CHAT_PORTS = [
	{
		id: "chat-port-a",
		title: "Chat Port A",
		description: "Use this panel for the first stream.",
	},
	{
		id: "chat-port-b",
		title: "Chat Port B",
		description: "Use this panel for the second stream.",
	},
	{
		id: "chat-port-c",
		title: "Chat Port C",
		description: "Use this panel for the third stream.",
	},
] as const;

function MultiportChatPanel({
	title,
	description,
}: Readonly<{ title: string; description: string }>) {
	return (
		<section className="rounded-xl border border-border bg-surface-raised p-3">
			<header className="mb-3 rounded-md bg-bg-neutral-subtle px-3 py-2">
				<h2 className="text-sm font-semibold text-text">{title}</h2>
				<p className="text-xs text-text-subtle">{description}</p>
			</header>
			<div className="flex justify-center">
				<RovoChatProvider>
					<ChatPanel onClose={() => {}} />
				</RovoChatProvider>
			</div>
		</section>
	);
}

export default function SidebarChatMultiportsPage() {
	return (
		<main className="min-h-svh bg-bg-neutral-subtle p-4 md:p-6">
			<header className="mb-4">
				<h1 className="text-lg font-semibold text-text">Sidebar Chat Multiport Demo</h1>
				<p className="text-sm text-text-subtle">
					Each panel has an isolated chat provider so you can test three concurrent streams.
				</p>
			</header>
			<div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
				{CHAT_PORTS.map((chatPort) => (
					<MultiportChatPanel
						key={chatPort.id}
						title={chatPort.title}
						description={chatPort.description}
					/>
				))}
			</div>
		</main>
	);
}
