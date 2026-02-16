"use client";

import {
	Artifact,
	ArtifactAction,
	ArtifactActions,
	ArtifactClose,
	ArtifactContent,
	ArtifactDescription,
	ArtifactHeader,
	ArtifactTitle,
} from "@/components/ui-ai/artifact";
import { CodeBlock } from "@/components/ui-ai/code-block";
import {
	CopyIcon,
	DownloadIcon,
	PlayIcon,
	RefreshCwIcon,
	ShareIcon,
} from "lucide-react";

const dijkstraCode = `# Dijkstra's Algorithm implementation
import heapq

def dijkstra(graph, start):
    distances = {node: float('inf') for node in graph}
    distances[start] = 0
    heap = [(0, start)]
    visited = set()

    while heap:
        current_distance, current_node = heapq.heappop(heap)
        if current_node in visited:
            continue
        visited.add(current_node)

        for neighbor, weight in graph[current_node].items():
            distance = current_distance + weight
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                heapq.heappush(heap, (distance, neighbor))

    return distances

# Example graph
graph = {
    'A': {'B': 1, 'C': 4},
    'B': {'A': 1, 'C': 2, 'D': 5},
    'C': {'A': 4, 'B': 2, 'D': 1},
    'D': {'B': 5, 'C': 1}
}

print(dijkstra(graph, "A"))`;

export function ArtifactDemoWithCode() {
	return (
		<Artifact className="w-full">
			<ArtifactHeader>
				<div>
					<ArtifactTitle>Dijkstra&apos;s Algorithm Implementation</ArtifactTitle>
					<ArtifactDescription>Updated 1 minute ago</ArtifactDescription>
				</div>
				<div className="flex items-center gap-2">
					<ArtifactActions>
						<ArtifactAction
							icon={PlayIcon}
							label="Run"
							onClick={() => console.log("Run")}
							tooltip="Run code"
						/>
						<ArtifactAction
							icon={CopyIcon}
							label="Copy"
							onClick={() => console.log("Copy")}
							tooltip="Copy to clipboard"
						/>
						<ArtifactAction
							icon={RefreshCwIcon}
							label="Regenerate"
							onClick={() => console.log("Regenerate")}
							tooltip="Regenerate content"
						/>
						<ArtifactAction
							icon={DownloadIcon}
							label="Download"
							onClick={() => console.log("Download")}
							tooltip="Download file"
						/>
						<ArtifactAction
							icon={ShareIcon}
							label="Share"
							onClick={() => console.log("Share")}
							tooltip="Share artifact"
						/>
					</ArtifactActions>
				</div>
			</ArtifactHeader>
			<ArtifactContent className="p-0">
				<CodeBlock
					className="border-none"
					code={dijkstraCode}
					language="python"
					showLineNumbers
				/>
			</ArtifactContent>
		</Artifact>
	);
}

export function ArtifactDemoWithClose() {
	return (
		<Artifact className="w-full">
			<ArtifactHeader>
				<div>
					<ArtifactTitle>API Response</ArtifactTitle>
					<ArtifactDescription>application/json</ArtifactDescription>
				</div>
				<div className="flex items-center gap-2">
					<ArtifactActions>
						<ArtifactAction
							icon={CopyIcon}
							label="Copy"
							tooltip="Copy to clipboard"
						/>
					</ArtifactActions>
					<ArtifactClose />
				</div>
			</ArtifactHeader>
			<ArtifactContent>
				<CodeBlock
					className="border-none shadow-none"
					code={`{
  "status": "success",
  "data": {
    "shortest_paths": {
      "A": 0,
      "B": 1,
      "C": 3,
      "D": 4
    }
  }
}`}
					language="json"
				/>
			</ArtifactContent>
		</Artifact>
	);
}

export function ArtifactDemoDocument() {
	return (
		<Artifact className="w-full">
			<ArtifactHeader>
				<div>
					<ArtifactTitle>Project README</ArtifactTitle>
					<ArtifactDescription>Markdown document</ArtifactDescription>
				</div>
				<ArtifactActions>
					<ArtifactAction
						icon={CopyIcon}
						label="Copy"
						tooltip="Copy content"
					/>
					<ArtifactAction
						icon={DownloadIcon}
						label="Download"
						tooltip="Download file"
					/>
				</ArtifactActions>
			</ArtifactHeader>
			<ArtifactContent className="prose prose-sm max-w-none text-foreground">
				<h2 className="text-base font-semibold">Graph Algorithms Library</h2>
				<p className="text-muted-foreground">
					A collection of graph algorithm implementations in Python, including
					Dijkstra&apos;s shortest path, BFS, DFS, and A* search.
				</p>
				<h3 className="text-sm font-medium">Features</h3>
				<ul className="text-sm text-muted-foreground">
					<li>Weighted and unweighted graph support</li>
					<li>Adjacency list and matrix representations</li>
					<li>Comprehensive test coverage</li>
					<li>Type-annotated source code</li>
				</ul>
			</ArtifactContent>
		</Artifact>
	);
}

export function ArtifactDemoMinimal() {
	return (
		<Artifact className="w-full">
			<ArtifactHeader>
				<ArtifactTitle>Generated Component</ArtifactTitle>
				<ArtifactActions>
					<ArtifactAction
						icon={CopyIcon}
						label="Copy"
						tooltip="Copy code"
					/>
				</ArtifactActions>
			</ArtifactHeader>
			<ArtifactContent>
				<CodeBlock
					className="border-none shadow-none"
					code={`export function Button({ children, onClick }) {
  return (
    <button
      className="px-4 py-2 rounded-md bg-primary text-white"
      onClick={onClick}
    >
      {children}
    </button>
  );
}`}
					language="tsx"
				/>
			</ArtifactContent>
		</Artifact>
	);
}

export default function ArtifactDemo() {
	return <ArtifactDemoWithCode />;
}
