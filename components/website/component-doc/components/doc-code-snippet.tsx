"use client";

import {
	CodeBlock,
	CodeBlockHeader,
	CodeBlockTitle,
	CodeBlockCopyButton,
} from "@/components/ui-ai/code-block";
import type { BundledLanguage } from "shiki";

interface DocCodeSnippetProps {
	code: string;
	language?: BundledLanguage;
	title?: string;
}

export function DocCodeSnippet({ code, language = "tsx", title }: Readonly<DocCodeSnippetProps>) {
	return (
		<CodeBlock code={code} language={language}>
			<CodeBlockHeader>
				<CodeBlockTitle>{title}</CodeBlockTitle>
				<CodeBlockCopyButton />
			</CodeBlockHeader>
		</CodeBlock>
	);
}
