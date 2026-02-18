"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

const PORTS = [
	{ id: "a", label: "Port A" },
	{ id: "b", label: "Port B" },
	{ id: "c", label: "Port C" },
] as const;

export default function MultiportsDemo(): React.ReactElement {
	return (
		<main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
			<header className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold text-text">Multiports</h1>
				<p className="text-sm text-text-subtle">
					Mini utility entrypoint for the three-panel Sidebar Chat smoke test.
				</p>
			</header>

			<section className="grid gap-3 md:grid-cols-3">
				{PORTS.map((port) => (
					<article
						key={port.id}
						className="rounded-lg border border-border bg-surface-raised p-3"
					>
						<h2 className="text-sm font-semibold text-text">{port.label}</h2>
						<p className="mt-1 text-xs text-text-subtle">
							Isolated chat provider instance for concurrent message streaming.
						</p>
						<div className="mt-3 rounded-md border border-border bg-surface p-3">
							<div className="h-2.5 w-16 rounded-full bg-bg-brand-bold" />
							<div className="mt-2 h-2.5 w-full rounded-full bg-bg-neutral-subtle" />
							<div className="mt-1.5 h-2.5 w-3/4 rounded-full bg-bg-neutral-subtle" />
						</div>
					</article>
				))}
			</section>

			<div className="flex items-center gap-3">
				<Button
					nativeButton={false}
					render={<Link href="/sidebar-chat-multiports" />}
				>
					Open full multiports demo
				</Button>
				<span className="text-xs text-text-subtle">
					Route: /sidebar-chat-multiports
				</span>
			</div>
		</main>
	);
}
