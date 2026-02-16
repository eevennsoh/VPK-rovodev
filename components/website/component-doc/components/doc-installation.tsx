"use client";

import { DocSection } from "./doc-section";
import { DocCodeSnippet } from "./doc-code-snippet";

interface DocInstallationProps {
	importPath: string;
	name: string;
}

export function DocInstallation({ importPath, name }: Readonly<DocInstallationProps>) {
	const importStatement = `import { ${name.replace(/\s+/g, "")} } from "${importPath}";`;

	return (
		<DocSection id="installation" title="Import">
			<DocCodeSnippet code={importStatement} language="tsx" title="Import" />
		</DocSection>
	);
}
