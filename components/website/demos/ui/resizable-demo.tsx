"use client";

import * as React from "react";
import type { Layout } from "react-resizable-panels";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

export default function ResizableDemo() {
	return (
		<ResizablePanelGroup className="w-48 rounded-md border">
			<ResizablePanel defaultSize={60}>
				<div className="flex h-16 items-center justify-center text-xs text-muted-foreground">A</div>
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel defaultSize={40}>
				<div className="flex h-16 items-center justify-center text-xs text-muted-foreground">B</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}

export function ResizableDemoControlled() {
	const [layout, setLayout] = React.useState<Layout>({});

	return (
		<ResizablePanelGroup
			orientation="horizontal"
			className="min-h-[200px] rounded-lg border"
			onLayoutChange={setLayout}
		>
			<ResizablePanel defaultSize="30%" id="left" minSize="20%">
				<div className="flex h-full flex-col items-center justify-center gap-2 p-6">
					<span className="font-semibold">
						{Math.round(layout.left ?? 30)}%
					</span>
				</div>
			</ResizablePanel>
			<ResizableHandle />
			<ResizablePanel defaultSize="70%" id="right" minSize="30%">
				<div className="flex h-full flex-col items-center justify-center gap-2 p-6">
					<span className="font-semibold">
						{Math.round(layout.right ?? 70)}%
					</span>
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}

export function ResizableDemoDefault() {
	return (
		<ResizablePanelGroup orientation="horizontal" className="max-w-md rounded-lg border">
			<ResizablePanel defaultSize={50}>
				<div className="flex h-32 items-center justify-center p-4">
					<span className="text-sm font-medium">Panel 1</span>
				</div>
			</ResizablePanel>
			<ResizableHandle />
			<ResizablePanel defaultSize={50}>
				<div className="flex h-32 items-center justify-center p-4">
					<span className="text-sm font-medium">Panel 2</span>
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}

export function ResizableDemoHorizontal() {
	return (
		<ResizablePanelGroup
			orientation="horizontal"
			className="min-h-[200px] rounded-lg border"
		>
			<ResizablePanel defaultSize="25%">
				<div className="flex h-full items-center justify-center p-6">
					<span className="font-semibold">Sidebar</span>
				</div>
			</ResizablePanel>
			<ResizableHandle />
			<ResizablePanel defaultSize="75%">
				<div className="flex h-full items-center justify-center p-6">
					<span className="font-semibold">Content</span>
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}

export function ResizableDemoNested() {
	return (
		<ResizablePanelGroup
			orientation="horizontal"
			className="rounded-lg border"
		>
			<ResizablePanel defaultSize="50%">
				<div className="flex h-[200px] items-center justify-center p-6">
					<span className="font-semibold">One</span>
				</div>
			</ResizablePanel>
			<ResizableHandle />
			<ResizablePanel defaultSize="50%">
				<ResizablePanelGroup orientation="vertical">
					<ResizablePanel defaultSize="25%">
						<div className="flex h-full items-center justify-center p-6">
							<span className="font-semibold">Two</span>
						</div>
					</ResizablePanel>
					<ResizableHandle />
					<ResizablePanel defaultSize="75%">
						<div className="flex h-full items-center justify-center p-6">
							<span className="font-semibold">Three</span>
						</div>
					</ResizablePanel>
				</ResizablePanelGroup>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}

export function ResizableDemoVertical() {
	return (
		<ResizablePanelGroup
			orientation="vertical"
			className="min-h-[200px] rounded-lg border"
		>
			<ResizablePanel defaultSize="25%">
				<div className="flex h-full items-center justify-center p-6">
					<span className="font-semibold">Header</span>
				</div>
			</ResizablePanel>
			<ResizableHandle />
			<ResizablePanel defaultSize="75%">
				<div className="flex h-full items-center justify-center p-6">
					<span className="font-semibold">Content</span>
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}

export function ResizableDemoWithHandle() {
	return (
		<ResizablePanelGroup
			orientation="horizontal"
			className="min-h-[200px] rounded-lg border"
		>
			<ResizablePanel defaultSize="25%">
				<div className="flex h-full items-center justify-center p-6">
					<span className="font-semibold">Sidebar</span>
				</div>
			</ResizablePanel>
			<ResizableHandle withHandle />
			<ResizablePanel defaultSize="75%">
				<div className="flex h-full items-center justify-center p-6">
					<span className="font-semibold">Content</span>
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
