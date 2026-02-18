const NON_EXECUTION_PLAN_PATTERNS = [
	/\b(subscription|pricing|billing|payment|mobile|cell|phone|data|internet|meal|travel|insurance|retirement)\s+plans?\b/i,
	/\b(enterprise|starter|pro|free)\s+plans?\b/i,
	/\bcompare\s+plans?\b/i,
	/\bwhich\s+plan\b/i,
];

const STRONG_PLANNING_PATTERNS = [
	/\b(create|make|draft|build|develop|generate|outline|prepare|propose)\s+(?:an?\s+)?(?:implementation\s+|execution\s+|rollout\s+|project\s+)?plan\b/i,
	/\b(help\s+me\s+)?(?:coordinate|organize|plan)\s+(?:on\s+)?(?:a\s+|an\s+|the\s+)?(?:team\s+)?(?:event|project|release|launch|migration|rollout)\b/i,
	/\b(execution|implementation|rollout|project)\s+plan\b/i,
	/\broadmap\b/i,
	/\bmilestones?\b/i,
	/\baction\s*items?\b/i,
	/\btask\s+list\b/i,
	/\bnext\s+steps?\b/i,
	/\bbreak\s+(?:this|it|that)\s+down\b/i,
	/\bstep[-\s]?by[-\s]?step\b/i,
];

const GENERIC_PLAN_NOUN_PATTERN =
	/\b(plan|planning|roadmap|timeline|milestones?|tasks?|steps?)\b/i;
const EXECUTION_VERB_PATTERN =
	/\b(implement|execute|build|ship|launch|migrate|refactor|deploy|deliver|roll\s*out|fix|solve)\b/i;
const PLANNING_QUESTION_PATTERN =
	/\b(how\s+(?:should|do)\s+(?:we|i)\s+(?:implement|execute|roll\s*out|ship|migrate|launch)|plan\s+for\s+(?:implementing|building|shipping|migrating|launching|delivering))\b/i;

function normalizeWhitespace(value) {
	return value.replace(/\s+/g, " ").trim();
}

function hasAnyPattern(value, patterns) {
	return patterns.some((pattern) => pattern.test(value));
}

function detectPlanningIntent(value) {
	if (typeof value !== "string") {
		return false;
	}

	const normalizedValue = normalizeWhitespace(value);
	if (!normalizedValue) {
		return false;
	}

	if (hasAnyPattern(normalizedValue, STRONG_PLANNING_PATTERNS)) {
		return true;
	}

	if (hasAnyPattern(normalizedValue, NON_EXECUTION_PLAN_PATTERNS)) {
		return false;
	}

	if (!GENERIC_PLAN_NOUN_PATTERN.test(normalizedValue)) {
		return false;
	}

	if (EXECUTION_VERB_PATTERN.test(normalizedValue)) {
		return true;
	}

	return PLANNING_QUESTION_PATTERN.test(normalizedValue);
}

module.exports = {
	detectPlanningIntent,
};
