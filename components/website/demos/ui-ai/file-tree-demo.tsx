"use client";

import { FileTree, FileTreeFolder, FileTreeFile } from "@/components/ui-ai/file-tree";

export default function FileTreeDemo() {
	return (
		<FileTree defaultExpanded={new Set(["src"])} className="w-full text-xs">
			<FileTreeFolder path="src" name="src">
				<FileTreeFile path="src/index.ts" name="index.ts" />
				<FileTreeFile path="src/utils.ts" name="utils.ts" />
			</FileTreeFolder>
			<FileTreeFile path="package.json" name="package.json" />
		</FileTree>
	);
}
