interface PlanTaskLike {
	label: string;
}

const DEFAULT_FALLBACK_TITLE = "Untitled task run";
const DEFAULT_EMOJI = "📋";
const TITLE_MAX_WORDS = 8;
const FALLBACK_EMOJI_POOL = ["📋", "🧭", "🛠️", "⚙️", "🧠", "🧩", "📌", "🗂️"];

const GENERIC_PLAN_TITLE_SET = new Set([
	"plan",
	"execution plan",
	"project plan",
	"work plan",
	"task plan",
	"planning draft",
	"plan draft",
	"untitled task run",
]);

const TITLE_EMOJI_RULES: Array<{ pattern: RegExp; emoji: string }> = [
	{ pattern: /\b(bug|fix|hotfix|incident|error|regression)\b/i, emoji: "🐛" },
	{ pattern: /\b(deploy|release|launch|ship|rollout)\b/i, emoji: "🚀" },
	{ pattern: /\b(design|ui|ux|mockup|visual)\b/i, emoji: "🎨" },
	{ pattern: /\b(research|discovery|investigate|analy[sz]e)\b/i, emoji: "🔍" },
	{ pattern: /\b(docs?|document|write|content|copy)\b/i, emoji: "📝" },
	{ pattern: /\b(data|metric|analytics?|dashboard|report)\b/i, emoji: "📊" },
	{ pattern: /\b(test|qa|validate|verification|a11y|accessibility)\b/i, emoji: "✅" },
];

function normalizeWhitespace(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

function truncateWords(value: string, maxWords: number = TITLE_MAX_WORDS): string {
	const words = normalizeWhitespace(value).split(" ").filter(Boolean);
	if (words.length === 0) {
		return "";
	}
	return words.slice(0, maxWords).join(" ");
}

function stripMarkdownDecorators(value: string): string {
	return value
		.replace(/\*\*([^*\n]+)\*\*/g, "$1")
		.replace(/__([^_\n]+)__/g, "$1")
		.replace(/`([^`\n]+)`/g, "$1")
		.replace(/^[*_`\s]+/, "")
		.replace(/[\s*_`]+$/, "")
		.trim();
}

function stripTaskPrefix(value: string): string {
	return value
		.replace(/^\s*(?:[-*+•◦▪]\s*)?(?:\[(?: |x|X)\]\s*|(?:☐|☑|✅)\s*)?/, "")
		.replace(/^\s*(?:\d+|[A-Za-z])[\.\)]\s+/, "")
		.trim();
}

function normalizePlanTitleCandidate(value: string): string {
	return normalizeWhitespace(
		stripMarkdownDecorators(
			value
				.replace(/^#{1,6}\s*/, "")
				.replace(/:$/, "")
		)
	);
}

function extractTaskHeadingFromLabel(label: string): string {
	const normalized = normalizePlanTitleCandidate(stripTaskPrefix(label));
	if (!normalized) {
		return "";
	}

	const emDashIndex = normalized.indexOf("—");
	if (emDashIndex === -1) {
		return normalized;
	}

	const heading = normalizePlanTitleCandidate(normalized.slice(0, emDashIndex));
	return heading || normalized;
}

export function isGenericPlanTitle(title: string): boolean {
	const normalized = normalizePlanTitleCandidate(title).toLowerCase();
	if (!normalized) {
		return true;
	}

	if (GENERIC_PLAN_TITLE_SET.has(normalized)) {
		return true;
	}

	return /^(?:the\s+)?(?:execution|project|work|task|implementation)\s+plan$/.test(
		normalized
	);
}

export function derivePlanTitleFromTasks(
	tasks: ReadonlyArray<PlanTaskLike>,
	options?: Readonly<{ fallbackTitle?: string; maxWords?: number }>
): string {
	const fallbackTitle = options?.fallbackTitle ?? DEFAULT_FALLBACK_TITLE;
	const maxWords = options?.maxWords ?? TITLE_MAX_WORDS;

	for (const task of tasks) {
		const heading = extractTaskHeadingFromLabel(task.label);
		if (!heading || isGenericPlanTitle(heading)) {
			continue;
		}

		const truncatedHeading = truncateWords(heading, maxWords);
		if (truncatedHeading) {
			return truncatedHeading;
		}
	}

	return fallbackTitle;
}

export function resolvePlanDisplayTitle(
	rawTitle: string | undefined,
	tasks: ReadonlyArray<PlanTaskLike>,
	options?: Readonly<{ fallbackTitle?: string; maxWords?: number }>
): string {
	const fallbackTitle = options?.fallbackTitle ?? DEFAULT_FALLBACK_TITLE;
	const normalizedTitle = rawTitle ? normalizePlanTitleCandidate(rawTitle) : "";
	if (normalizedTitle && !isGenericPlanTitle(normalizedTitle)) {
		return normalizedTitle;
	}

	return derivePlanTitleFromTasks(tasks, {
		fallbackTitle,
		maxWords: options?.maxWords,
	});
}

export function derivePlanEmojiFromTitle(title: string): string {
	const normalizedTitle = normalizePlanTitleCandidate(title);
	if (!normalizedTitle) {
		return DEFAULT_EMOJI;
	}

	for (const rule of TITLE_EMOJI_RULES) {
		if (rule.pattern.test(normalizedTitle)) {
			return rule.emoji;
		}
	}

	let hash = 0;
	for (let index = 0; index < normalizedTitle.length; index += 1) {
		hash = (hash * 31 + normalizedTitle.charCodeAt(index)) >>> 0;
	}

	return FALLBACK_EMOJI_POOL[hash % FALLBACK_EMOJI_POOL.length] ?? DEFAULT_EMOJI;
}
