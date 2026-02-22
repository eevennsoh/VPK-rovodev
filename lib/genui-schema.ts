/**
 * GenUI payload schema contract and validation utility.
 *
 * FND-002: Validates json-render payloads before render path selection.
 * FND-004: Schema-level support for onboarding demo widgets.
 *
 * This module is imported by both frontend and backend — keep it free of
 * Node-only or React-only dependencies.
 */

import type { Spec } from "@json-render/react";

// ---------------------------------------------------------------------------
// FND-002: json-render payload schema contract
// ---------------------------------------------------------------------------

/**
 * Result of validating a GenUI payload. If `valid` is false, `errors`
 * describes every structural problem found.
 */
export interface GenuiPayloadValidationResult {
	readonly valid: boolean;
	readonly errors: readonly string[];
}

/**
 * A validated GenUI payload. The `spec` is guaranteed to have a non-empty
 * `root` key and at least one element.
 */
export interface ValidGenuiPayload {
	readonly spec: Spec;
	readonly summary?: string;
	readonly source?: string;
}

/**
 * Checks whether `value` looks like a plain object (non-null, non-array).
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Returns a trimmed string if `value` is a non-empty string, else undefined.
 */
function nonEmptyString(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Validates a raw GenUI payload *before* it enters the render path.
 *
 * Structural checks:
 * 1. Payload must be a non-null object.
 * 2. `spec` must be a non-null object with a non-empty string `root`.
 * 3. `spec.elements` must be a non-null object with at least one key.
 * 4. The root key must reference an existing element.
 * 5. Every element must have a non-empty string `type`.
 * 6. Every element's `children` (if present) must be an array of strings
 *    that all reference existing element keys.
 */
export function validateGenuiPayload(value: unknown): GenuiPayloadValidationResult {
	const errors: string[] = [];

	if (!isRecord(value)) {
		return { valid: false, errors: ["Payload must be a non-null object"] };
	}

	const rawSpec = value.spec;
	if (!isRecord(rawSpec)) {
		return { valid: false, errors: ["Payload.spec must be a non-null object"] };
	}

	const root = nonEmptyString(rawSpec.root);
	if (!root) {
		errors.push("spec.root must be a non-empty string");
	}

	const elements = rawSpec.elements;
	if (!isRecord(elements)) {
		errors.push("spec.elements must be a non-null object");
		return { valid: false, errors };
	}

	const elementKeys = Object.keys(elements);
	if (elementKeys.length === 0) {
		errors.push("spec.elements must contain at least one element");
		return { valid: false, errors };
	}

	const elementKeySet = new Set(elementKeys);

	if (root && !elementKeySet.has(root)) {
		errors.push(`spec.root "${root}" does not reference an existing element`);
	}

	for (const key of elementKeys) {
		const element = elements[key];
		if (!isRecord(element)) {
			errors.push(`Element "${key}" must be a non-null object`);
			continue;
		}

		const elementType = nonEmptyString(element.type as unknown);
		if (!elementType) {
			errors.push(`Element "${key}" must have a non-empty string "type"`);
		}

		const children = element.children;
		if (children !== undefined) {
			if (!Array.isArray(children)) {
				errors.push(`Element "${key}".children must be an array`);
			} else {
				for (let i = 0; i < children.length; i++) {
					const childKey = children[i];
					if (typeof childKey !== "string" || childKey.trim().length === 0) {
						errors.push(`Element "${key}".children[${i}] must be a non-empty string`);
					} else if (!elementKeySet.has(childKey)) {
						errors.push(`Element "${key}".children[${i}] references missing element "${childKey}"`);
					}
				}
			}
		}
	}

	return { valid: errors.length === 0, errors };
}

/**
 * Attempts to parse and validate a raw payload into a typed `ValidGenuiPayload`.
 * Returns `null` if the payload is structurally invalid.
 */
export function parseGenuiPayload(value: unknown): ValidGenuiPayload | null {
	const validation = validateGenuiPayload(value);
	if (!validation.valid) {
		return null;
	}

	const record = value as Record<string, unknown>;
	const rawSpec = record.spec as Record<string, unknown>;

	const spec: Spec = {
		root: rawSpec.root as string,
		elements: rawSpec.elements as Record<string, unknown>,
		...(rawSpec.state !== undefined ? { state: rawSpec.state } : {}),
	} as Spec;

	return {
		spec,
		summary: nonEmptyString(record.summary),
		source: nonEmptyString(record.source),
	};
}

// ---------------------------------------------------------------------------
// FND-004: Onboarding demo widget pattern definitions and validation
// ---------------------------------------------------------------------------

/**
 * The set of UI patterns required by the onboarding demo pack.
 * Each pattern maps to a specific E2E fixture prompt (Q1–Q4).
 */
export type OnboardingWidgetPattern =
	| "tabs"
	| "chart"
	| "table"
	| "timeline"
	| "calculator-controls"
	| "accordion-form";

/**
 * Element type strings that map to each onboarding pattern.
 * Used by `detectWidgetPatterns` to scan a spec's elements.
 */
const PATTERN_ELEMENT_TYPES: Readonly<Record<OnboardingWidgetPattern, ReadonlyArray<RegExp>>> = {
	tabs: [/^tabs$/i, /^tab$/i, /^tab[-_]?panel$/i, /^tab[-_]?list$/i],
	chart: [
		/chart$/i,
		/^bar[-_]?chart$/i,
		/^line[-_]?chart$/i,
		/^area[-_]?chart$/i,
		/^pie[-_]?chart$/i,
		/^radar[-_]?chart$/i,
		/^scatter[-_]?chart$/i,
	],
	table: [/^table$/i, /^data[-_]?table$/i],
	timeline: [/^timeline$/i, /^timeline[-_]?item$/i],
	"calculator-controls": [
		/^slider$/i,
		/^range[-_]?slider$/i,
		/^radio$/i,
		/^radio[-_]?group$/i,
		/^checkbox$/i,
		/^checkbox[-_]?group$/i,
	],
	"accordion-form": [
		/^accordion$/i,
		/^accordion[-_]?item$/i,
		/^accordion[-_]?form$/i,
		/^collapsible$/i,
	],
};

/**
 * Scans a validated spec and returns the set of onboarding widget patterns
 * present in its element tree.
 */
export function detectWidgetPatterns(spec: Spec): Set<OnboardingWidgetPattern> {
	const found = new Set<OnboardingWidgetPattern>();
	const elements = spec.elements;

	if (!elements || typeof elements !== "object") {
		return found;
	}

	for (const element of Object.values(elements)) {
		if (!isRecord(element)) continue;

		const elementType = nonEmptyString(element.type as unknown);
		if (!elementType) continue;

		for (const [pattern, matchers] of Object.entries(PATTERN_ELEMENT_TYPES) as Array<
			[OnboardingWidgetPattern, ReadonlyArray<RegExp>]
		>) {
			if (found.has(pattern)) continue;

			for (const matcher of matchers) {
				if (matcher.test(elementType)) {
					found.add(pattern);
					break;
				}
			}
		}
	}

	return found;
}

/**
 * Checks whether a spec contains all the patterns required by a specific
 * onboarding demo question.
 *
 * Q1 (total rewards): requires `tabs` + at least one of (`chart` | `table`)
 * Q2 (milestones):    requires `timeline`
 * Q3 (flex wallet):   requires `calculator-controls`
 * Q4 (financial plan): requires `accordion-form`
 */
export type OnboardingDemoQuestion = "Q1" | "Q2" | "Q3" | "Q4";

const DEMO_QUESTION_REQUIREMENTS: Readonly<
	Record<OnboardingDemoQuestion, (patterns: Set<OnboardingWidgetPattern>) => boolean>
> = {
	Q1: (p) => p.has("tabs") && (p.has("chart") || p.has("table")),
	Q2: (p) => p.has("timeline"),
	Q3: (p) => p.has("calculator-controls"),
	Q4: (p) => p.has("accordion-form"),
};

/**
 * Validates whether a spec satisfies the requirements for a specific
 * onboarding demo question. Returns the detected patterns and whether
 * the requirement is met.
 */
export function validateOnboardingDemo(
	spec: Spec,
	question: OnboardingDemoQuestion
): Readonly<{ satisfied: boolean; detectedPatterns: ReadonlyArray<OnboardingWidgetPattern>; question: OnboardingDemoQuestion }> {
	const patterns = detectWidgetPatterns(spec);
	const checker = DEMO_QUESTION_REQUIREMENTS[question];

	return {
		satisfied: checker(patterns),
		detectedPatterns: Array.from(patterns),
		question,
	};
}

/**
 * Validates a spec against ALL onboarding demo questions and returns
 * a summary of which questions are satisfied.
 */
export function validateAllOnboardingDemos(
	spec: Spec
): Readonly<{ results: ReadonlyArray<ReturnType<typeof validateOnboardingDemo>>; allSatisfied: boolean }> {
	const questions: OnboardingDemoQuestion[] = ["Q1", "Q2", "Q3", "Q4"];
	const results = questions.map((q) => validateOnboardingDemo(spec, q));

	return {
		results,
		allSatisfied: results.every((r) => r.satisfied),
	};
}
