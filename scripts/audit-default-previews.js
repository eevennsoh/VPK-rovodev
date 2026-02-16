#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const ROOT = process.cwd();
const REGISTRY_PATH = path.join(ROOT, "components/website/registry.ts");
const DEFAULT_DEMO_MAPS = new Set([
	"UI_DEMO",
	"UI_AI_DEMO",
	"BLOCK_DEMOS",
	"TEMPLATE_DEMOS",
	"UTILITY_DEMOS",
]);
const ALLOW_MARKER = "preview-inline-style-allowed";
const VALID_ALLOW_MARKER_PATTERN = /preview-inline-style-allowed:\s*\S+/;
const REDUNDANT_DEFAULT_PROP_NAMES = new Set(["variant", "size", "appearance"]);

function readText(filePath) {
	return fs.readFileSync(filePath, "utf8");
}

function toRelativePath(filePath) {
	return path.relative(ROOT, filePath).replaceAll(path.sep, "/");
}

function parseSource(filePath) {
	const text = readText(filePath);
	return ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function resolveImportToFile(registryDir, importPath) {
	const unresolved = importPath.startsWith("@/")
		? path.join(ROOT, importPath.slice(2))
		: path.resolve(registryDir, importPath);

	const ext = path.extname(unresolved);
	if (ext && fs.existsSync(unresolved)) {
		return unresolved;
	}

	const candidates = [
		`${unresolved}.tsx`,
		`${unresolved}.ts`,
		`${unresolved}.jsx`,
		`${unresolved}.js`,
		path.join(unresolved, "index.tsx"),
		path.join(unresolved, "index.ts"),
		path.join(unresolved, "index.jsx"),
		path.join(unresolved, "index.js"),
	];

	for (const candidate of candidates) {
		if (fs.existsSync(candidate)) {
			return candidate;
		}
	}

	return null;
}

function findFirstDynamicImportPath(node) {
	let found = null;

	function visit(current) {
		if (found) {
			return;
		}

		if (ts.isCallExpression(current) && current.expression.kind === ts.SyntaxKind.ImportKeyword) {
			const [arg] = current.arguments;
			if (arg && ts.isStringLiteralLike(arg)) {
				found = arg.text;
				return;
			}
		}

		ts.forEachChild(current, visit);
	}

	visit(node);
	return found;
}

function collectDefaultPreviewFiles() {
	const registrySource = parseSource(REGISTRY_PATH);
	const registryDir = path.dirname(REGISTRY_PATH);
	const files = new Set();

	for (const statement of registrySource.statements) {
		if (!ts.isVariableStatement(statement)) {
			continue;
		}

		for (const declaration of statement.declarationList.declarations) {
			if (!ts.isIdentifier(declaration.name)) {
				continue;
			}

			if (!DEFAULT_DEMO_MAPS.has(declaration.name.text)) {
				continue;
			}

			if (!declaration.initializer || !ts.isObjectLiteralExpression(declaration.initializer)) {
				continue;
			}

			for (const property of declaration.initializer.properties) {
				if (!ts.isPropertyAssignment(property)) {
					continue;
				}

				const importPath = findFirstDynamicImportPath(property.initializer);
				if (!importPath) {
					continue;
				}

				const resolved = resolveImportToFile(registryDir, importPath);
				if (!resolved) {
					throw new Error(`Could not resolve import "${importPath}" from ${toRelativePath(REGISTRY_PATH)}`);
				}

				files.add(resolved);
			}
		}
	}

	return [...files].sort((a, b) => a.localeCompare(b));
}

function findTopLevelIdentifierDeclaration(sourceFile, identifierText) {
	for (const statement of sourceFile.statements) {
		if (ts.isFunctionDeclaration(statement) && statement.name?.text === identifierText) {
			return statement;
		}

		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name) && declaration.name.text === identifierText) {
					return declaration.initializer ?? null;
				}
			}
		}
	}

	return null;
}

function collectDefaultExportRoots(sourceFile) {
	const roots = [];

	for (const statement of sourceFile.statements) {
		if (ts.isFunctionDeclaration(statement)) {
			const hasDefaultExport =
				statement.modifiers?.some(
					(modifier) =>
						modifier.kind === ts.SyntaxKind.ExportKeyword || modifier.kind === ts.SyntaxKind.DefaultKeyword
				) &&
				statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword);

			if (hasDefaultExport) {
				roots.push(statement);
			}
			continue;
		}

		if (ts.isExportAssignment(statement)) {
			const expression = statement.expression;
			if (ts.isIdentifier(expression)) {
				const declaration = findTopLevelIdentifierDeclaration(sourceFile, expression.text);
				if (declaration) {
					roots.push(declaration);
				}
			} else {
				roots.push(expression);
			}
		}
	}

	return roots;
}

function getMarkerStatusNearby(sourceText, lineIndex) {
	const lines = sourceText.split(/\r?\n/u);
	const start = Math.max(0, lineIndex - 8);
	const end = Math.min(lines.length - 1, lineIndex + 1);

	for (let i = start; i <= end; i += 1) {
		const line = lines[i];
		if (!line.includes(ALLOW_MARKER)) {
			continue;
		}

		if (VALID_ALLOW_MARKER_PATTERN.test(line)) {
			return "valid";
		}

		return "invalid";
	}

	return "none";
}

function collectInlineStyleViolations(filePath) {
	const sourceText = readText(filePath);
	const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
	const roots = collectDefaultExportRoots(sourceFile);
	const violations = [];

	if (roots.length === 0) {
		return violations;
	}

	function visit(node) {
		if (ts.isJsxAttribute(node) && REDUNDANT_DEFAULT_PROP_NAMES.has(node.name.text)) {
			const value = getJsxAttributeStringValue(node);
			if (value === "default") {
				const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
				violations.push(
					`${toRelativePath(filePath)}:${line + 1}:${character + 1} redundant default prop "${node.name.text}=\"default\"" in default preview export`
				);
				return;
			}
		}

		if (ts.isJsxAttribute(node) && node.name.text === "style") {
			const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
			const markerStatus = getMarkerStatusNearby(sourceText, line);
			const location = `${toRelativePath(filePath)}:${line + 1}:${character + 1}`;

			if (markerStatus === "valid") {
				return;
			}

			if (markerStatus === "invalid") {
				violations.push(
					`${location} invalid ${ALLOW_MARKER} marker. Use: "${ALLOW_MARKER}: <reason>"`
				);
				return;
			}

			violations.push(
				`${location} inline style in default preview export. Remove it or add "${ALLOW_MARKER}: <reason>"`
			);
			return;
		}

		ts.forEachChild(node, visit);
	}

	for (const root of roots) {
		visit(root);
	}

	return violations;
}

function getJsxAttributeStringValue(attribute) {
	if (!attribute.initializer) {
		return null;
	}

	if (ts.isStringLiteral(attribute.initializer)) {
		return attribute.initializer.text;
	}

	if (ts.isJsxExpression(attribute.initializer)) {
		const expression = attribute.initializer.expression;
		if (expression && ts.isStringLiteralLike(expression)) {
			return expression.text;
		}
	}

	return null;
}

function main() {
	const demoFiles = collectDefaultPreviewFiles();
	const violations = [];

	for (const filePath of demoFiles) {
		violations.push(...collectInlineStyleViolations(filePath));
	}

	if (violations.length > 0) {
		console.error("Default preview audit failed:\n");
		for (const violation of violations) {
			console.error(`- ${violation}`);
		}
		process.exitCode = 1;
		return;
	}

	console.log(`Default preview audit passed (${demoFiles.length} files checked).`);
}

main();
