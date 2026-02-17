const {
	applySpecPatch,
	autoFixSpec,
	createMixedStreamParser,
	validateSpec,
} = require("@json-render/core");

function sanitizeSpec(spec) {
	const safeSpec = {
		root: typeof spec?.root === "string" ? spec.root : "",
		elements:
			spec?.elements &&
			typeof spec.elements === "object" &&
			!Array.isArray(spec.elements)
				? spec.elements
				: {},
	};

	if (
		spec &&
		Object.prototype.hasOwnProperty.call(spec, "state") &&
		spec.state !== undefined
	) {
		safeSpec.state = spec.state;
	}

	return safeSpec;
}

function isRenderableSpec(spec, validation) {
	if (!spec || typeof spec.root !== "string" || spec.root.trim().length === 0) {
		return false;
	}

	if (!spec.elements || Object.keys(spec.elements).length === 0) {
		return false;
	}

	return Boolean(validation?.valid);
}

function getMissingChildReferences(spec) {
	if (!spec?.elements || typeof spec.elements !== "object") {
		return [];
	}

	const references = [];
	const elements = spec.elements;
	for (const [parentKey, element] of Object.entries(elements)) {
		if (!element || typeof element !== "object") {
			continue;
		}

		const children = Array.isArray(element.children) ? element.children : [];
		for (const childKey of children) {
			if (typeof childKey !== "string" || childKey.trim().length === 0) {
				continue;
			}

			if (!Object.prototype.hasOwnProperty.call(elements, childKey)) {
				references.push({ parentKey, childKey });
			}
		}
	}

	return references;
}

function ensureUniqueElementKey(baseKey, elements) {
	if (!Object.prototype.hasOwnProperty.call(elements, baseKey)) {
		return baseKey;
	}

	let suffix = 1;
	while (Object.prototype.hasOwnProperty.call(elements, `${baseKey}_${suffix}`)) {
		suffix += 1;
	}

	return `${baseKey}_${suffix}`;
}

function synthesizeMissingChildren(spec) {
	const nextSpec = sanitizeSpec({
		...spec,
		elements: { ...(spec?.elements ?? {}) },
	});
	const missingRefs = getMissingChildReferences(nextSpec);

	if (missingRefs.length === 0) {
		const validation = validateSpec(nextSpec);
		return {
			spec: nextSpec,
			validation,
			renderable: isRenderableSpec(nextSpec, validation),
			synthesizedChildCount: 0,
			missingChildKeys: [],
		};
	}

	const missingChildKeys = [...new Set(missingRefs.map((ref) => ref.childKey))];
	let synthesizedChildCount = 0;

	for (const missingKey of missingChildKeys) {
		if (Object.prototype.hasOwnProperty.call(nextSpec.elements, missingKey)) {
			continue;
		}

		const detailsKey = ensureUniqueElementKey(
			`${missingKey}_autofix_details`,
			nextSpec.elements,
		);
		nextSpec.elements[detailsKey] = {
			type: "Text",
			props: {
				text: "Auto-repaired placeholder generated because the original response referenced a missing child element.",
			},
			children: [],
		};

		nextSpec.elements[missingKey] = {
			type: "Card",
			props: {
				title: "Generated section",
				description: "Recovered from incomplete model output.",
			},
			children: [detailsKey],
		};
		synthesizedChildCount += 1;
	}

	const validation = validateSpec(nextSpec);
	return {
		spec: nextSpec,
		validation,
		renderable: isRenderableSpec(nextSpec, validation),
		synthesizedChildCount,
		missingChildKeys,
	};
}

function analyzeGeneratedText(rawText) {
	const compiledSpec = { root: "", elements: {} };
	let patchCount = 0;
	let patchApplyErrors = 0;

	const parser = createMixedStreamParser({
		onPatch(patch) {
			patchCount += 1;
			try {
				applySpecPatch(compiledSpec, patch);
			} catch {
				patchApplyErrors += 1;
			}
		},
		onText() {
			// no-op: text is preserved in rawText
		},
	});

	parser.push(rawText);
	parser.flush();

	const sanitizedCompiledSpec = sanitizeSpec(compiledSpec);
	const validation = validateSpec(sanitizedCompiledSpec);
	const renderable = isRenderableSpec(sanitizedCompiledSpec, validation);

	let fixedSpec = null;
	let fixedValidation = null;
	let fixedRenderable = false;
	let fixes = [];
	let synthesizedSpec = null;
	let synthesizedValidation = null;
	let synthesizedRenderable = false;
	let synthesizedChildCount = 0;
	let missingChildKeys = [];

	if (patchCount > 0 && !renderable) {
		const fixedResult = autoFixSpec(sanitizedCompiledSpec);
		fixedSpec = sanitizeSpec(fixedResult.spec);
		fixedValidation = validateSpec(fixedSpec);
		fixedRenderable = isRenderableSpec(fixedSpec, fixedValidation);
		fixes = Array.isArray(fixedResult.fixes) ? fixedResult.fixes : [];

		if (!fixedRenderable) {
			const synthesized = synthesizeMissingChildren(fixedSpec);
			synthesizedSpec = synthesized.spec;
			synthesizedValidation = synthesized.validation;
			synthesizedRenderable = synthesized.renderable;
			synthesizedChildCount = synthesized.synthesizedChildCount;
			missingChildKeys = synthesized.missingChildKeys;
		}
	}

	return {
		rawText,
		patchCount,
		patchApplyErrors,
		spec: sanitizedCompiledSpec,
		validation,
		renderable,
		fixedSpec,
		fixedValidation,
		fixedRenderable,
		synthesizedSpec,
		synthesizedValidation,
		synthesizedRenderable,
		synthesizedChildCount,
		missingChildKeys,
		fixes,
	};
}

function pickBestSpec(analysis) {
	if (!analysis || typeof analysis !== "object") {
		return null;
	}

	if (analysis.renderable && analysis.spec) {
		return analysis.spec;
	}

	if (analysis.fixedRenderable && analysis.fixedSpec) {
		return analysis.fixedSpec;
	}

	if (analysis.synthesizedRenderable && analysis.synthesizedSpec) {
		return analysis.synthesizedSpec;
	}

	return null;
}

module.exports = {
	sanitizeSpec,
	isRenderableSpec,
	getMissingChildReferences,
	ensureUniqueElementKey,
	synthesizeMissingChildren,
	analyzeGeneratedText,
	pickBestSpec,
};
