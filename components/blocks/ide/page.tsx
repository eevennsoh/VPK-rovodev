"use client"

import { useState } from "react"

import type { BundledLanguage } from "shiki"

import {
	FileTree,
	FileTreeFile,
	FileTreeFolder,
} from "@/components/ui-ai/file-tree"
import {
	CodeBlock,
	CodeBlockCopyButton,
	CodeBlockHeader,
	CodeBlockTitle,
	CodeBlockFilename,
	CodeBlockActions,
} from "@/components/ui-ai/code-block"
import { Terminal } from "@/components/ui-ai/terminal"
import {
	Conversation,
	ConversationContent,
} from "@/components/ui-ai/conversation"
import {
	Message,
	MessageContent,
	MessageResponse,
} from "@/components/ui-ai/message"
import {
	Tool,
	ToolHeader,
	ToolContent,
	ToolInput,
	ToolOutput,
} from "@/components/ui-ai/tool"
import {
	PromptInput,
	PromptInputFooter,
	PromptInputSubmit,
	PromptInputTextarea,
} from "@/components/ui-ai/prompt-input"
import {
	MOCK_FILE_TREE,
	MOCK_CODE_FILES,
	MOCK_TERMINAL_OUTPUT,
	MOCK_CHAT_MESSAGES,
} from "./data/mock-data"

interface FileNode {
	type: string;
	name: string;
	path: string;
	children?: FileNode[];
}

function renderTree(nodes: FileNode[]) {
	return nodes.map((node) => {
		if (node.type === "folder") {
			return (
				<FileTreeFolder key={node.path} path={node.path} name={node.name}>
					{node.children && renderTree(node.children)}
				</FileTreeFolder>
			)
		}
		return <FileTreeFile key={node.path} path={node.path} name={node.name} />
	})
}

export default function AIIDEBlock() {
	const [selectedFile, setSelectedFile] = useState("src/components/button.tsx")
	const fileData = MOCK_CODE_FILES[selectedFile] ?? MOCK_CODE_FILES["src/components/button.tsx"]

	const handleFileSelect = (path: string) => {
		if (path in MOCK_CODE_FILES) {
			setSelectedFile(path)
		}
	}

	return (
		<div className="flex h-[600px] overflow-hidden rounded-lg border bg-background">
			{/* File tree sidebar */}
			<div className="flex w-60 flex-col border-r">
				<div className="border-b px-3 py-2">
					<h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Explorer</h3>
				</div>
				<div className="flex-1 overflow-auto">
					<FileTree
						selectedPath={selectedFile}
						onSelect={handleFileSelect as never}
						defaultExpanded={new Set(["src", "src/components", "src/lib"])}
						className="border-none rounded-none"
					>
						{renderTree(MOCK_FILE_TREE)}
					</FileTree>
				</div>
			</div>

			{/* Main content area */}
			<div className="flex flex-1 flex-col">
				{/* Code editor */}
				<div className="flex-1 overflow-auto">
					<CodeBlock code={fileData.code} language={fileData.language as BundledLanguage} showLineNumbers>
						<CodeBlockHeader>
							<CodeBlockTitle>
								<CodeBlockFilename>{selectedFile.split("/").pop()}</CodeBlockFilename>
							</CodeBlockTitle>
							<CodeBlockActions>
								<CodeBlockCopyButton />
							</CodeBlockActions>
						</CodeBlockHeader>
					</CodeBlock>
				</div>

				{/* Terminal */}
				<div className="h-48 border-t">
					<Terminal output={MOCK_TERMINAL_OUTPUT} />
				</div>
			</div>

			{/* Chat panel */}
			<div className="flex w-80 flex-col border-l">
				<div className="border-b px-3 py-2">
					<h3 className="font-medium text-sm">AI Assistant</h3>
				</div>

				<Conversation className="flex-1">
					<ConversationContent className="gap-4 p-3">
						{MOCK_CHAT_MESSAGES.map((msg) => (
							<Message key={msg.id} from={msg.role}>
								<MessageContent>
									<MessageResponse>{msg.content}</MessageResponse>
								</MessageContent>
								{msg.toolCall && (
									<Tool defaultOpen={false}>
										<ToolHeader
											title={msg.toolCall.name}
											type="tool-invocation"
											state={msg.toolCall.state}
										/>
										<ToolContent>
											<ToolInput input={msg.toolCall.input} />
											<ToolOutput
												output={msg.toolCall.output}
												errorText={undefined}
											/>
										</ToolContent>
									</Tool>
								)}
							</Message>
						))}
					</ConversationContent>
				</Conversation>

				<div className="border-t p-3">
					<PromptInput
						onSubmit={() => {}}
						className="rounded-lg border bg-background shadow-sm"
					>
						<PromptInputTextarea placeholder="Ask about the code..." />
						<PromptInputFooter>
							<div />
							<PromptInputSubmit />
						</PromptInputFooter>
					</PromptInput>
				</div>
			</div>
		</div>
	)
}
