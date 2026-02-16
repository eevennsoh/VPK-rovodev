"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { Streamdown } from "streamdown";
import { Button } from "@/components/ui/button";

const streamdownPlugins = { cjk, code, math, mermaid };

const FEATURE_MARKDOWN = `# Streamdown Feature Test

This paragraph checks **built-in typography**, _emphasis_, ~~strikethrough~~, and [a link](https://streamdown.ai/).

## GFM checklist + table

- [x] Task done
- [ ] Task pending

| Feature | Status | Score |
|:--|:--:|--:|
| Typography | ✅ | 10 |
| GFM Markdown | ✅ | 10 |
| Interactive controls | ✅ | 10 |

## Code block (TypeScript)

\`\`\`ts
type WorkItem = {
	id: string;
	title: string;
	done: boolean;
};

const nextItem: WorkItem = {
	id: "WI-128",
	title: "Ship streamdown test page",
	done: false,
};

console.log(nextItem.title);
\`\`\`

Inline math: $$E = mc^2$$ and $$\\\\int_0^1 x^2\\\\,dx = 1/3$$.

$$
\\\\nabla \\\\cdot \\\\vec{E} = \\\\frac{\\\\rho}{\\\\epsilon_0}
$$

## Mermaid diagram

\`\`\`mermaid
flowchart LR
	A["User Prompt"] --> B{"LLM"}
	B -->|"Tool Call"| C["Search API"]
	B -->|"Direct Answer"| D["Assistant Response"]
	C --> D
\`\`\`
`;

const STREAM_INTERVAL_MS = 24;
const STREAM_STEP_CHARS = 18;

export default function StreamdownDemo(): React.ReactElement {
	const [streamedMarkdown, setStreamedMarkdown] = useState("");
	const [isAnimating, setIsAnimating] = useState(false);
	const intervalRef = useRef<number | null>(null);

	const stopStreaming = useCallback(() => {
		if (intervalRef.current !== null) {
			window.clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}, []);

	const runStreamingTest = useCallback(() => {
		stopStreaming();
		setStreamedMarkdown("");
		setIsAnimating(true);

		let cursor = 0;
		intervalRef.current = window.setInterval(() => {
			cursor = Math.min(FEATURE_MARKDOWN.length, cursor + STREAM_STEP_CHARS);
			setStreamedMarkdown(FEATURE_MARKDOWN.slice(0, cursor));

			if (cursor >= FEATURE_MARKDOWN.length) {
				stopStreaming();
				setIsAnimating(false);
			}
		}, STREAM_INTERVAL_MS);
	}, [stopStreaming]);

	useEffect(() => {
		return () => {
			stopStreaming();
		};
	}, [stopStreaming]);

	return (
		<main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-8">
			<header className="flex flex-col gap-3">
				<h1 className="text-2xl font-semibold">Streamdown Feature Test</h1>
				<p className="text-sm text-muted-foreground">
					Typography, caret streaming, GFM, code controls, inline math, and Mermaid.
				</p>
				<div className="flex items-center gap-3">
					<Button onClick={runStreamingTest} type="button">
						Run streaming test
					</Button>
					<Button
						onClick={() => {
							stopStreaming();
							setIsAnimating(false);
							setStreamedMarkdown(FEATURE_MARKDOWN);
						}}
						type="button"
						variant="outline"
					>
						Show full content
					</Button>
				</div>
			</header>

			<section className="rounded-xl border bg-card p-4">
				<h2 className="mb-3 text-sm font-medium text-muted-foreground">
					Streaming render (animation enabled)
				</h2>
				<Streamdown
					controls={{
						code: true,
						table: true,
						mermaid: {
							copy: true,
							download: true,
							fullscreen: true,
							panZoom: true,
						},
					}}
					isAnimating={isAnimating}
					plugins={streamdownPlugins}
				>
					{streamedMarkdown}
				</Streamdown>
			</section>

			<section className="rounded-xl border bg-card p-4">
				<h2 className="mb-3 text-sm font-medium text-muted-foreground">
					Static render (full content)
				</h2>
				<Streamdown
					controls={{
						code: true,
						table: true,
						mermaid: {
							copy: true,
							download: true,
							fullscreen: true,
							panZoom: true,
						},
					}}
					mode="static"
					plugins={streamdownPlugins}
				>
					{FEATURE_MARKDOWN}
				</Streamdown>
			</section>
		</main>
	);
}
