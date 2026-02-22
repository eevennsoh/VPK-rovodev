"use client";

import { DocSection } from "./doc-section";
import { DocCodeSnippet } from "./doc-code-snippet";

interface DocInstallationProps {
	importPath: string;
	name: string;
}

export function DocInstallation({ importPath, name }: Readonly<DocInstallationProps>) {
	const componentName = name.replace(/\s+/g, "");
	const importPaths = importPath
		.split("\n")
		.map(path => path.trim())
		.filter(Boolean);
	const importStatement =
		importPaths.length > 1
			? importPaths.map(path => `import "${path}";`).join("\n")
			: `import { ${componentName} } from "${importPaths[0] ?? importPath}";`;

	return (
		<DocSection id="installation" title="Import">
			<DocCodeSnippet code={importStatement} language="tsx" title="Import" />
		</DocSection>
	);
}
