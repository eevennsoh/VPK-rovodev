export interface QuestionCardOption {
	/** Unique identifier for this option. */
	id: string;
	/** Display label for the option. */
	label: string;
	/** Optional secondary description shown below the label. */
	description?: string;
}

export interface QuestionCardQuestion {
	/** Unique identifier for this question. */
	id: string;
	/** The question text displayed as a heading. */
	label: string;
	/** Selection mode. `"single-select"` auto-advances; `"multi-select"` shows checkboxes and allows multiple picks. */
	kind: "single-select" | "multi-select" | "text";
	/** Pre-defined answer options. */
	options: ReadonlyArray<QuestionCardOption>;
}

export type QuestionCardAnswerValue = string | string[];
export type QuestionCardAnswers = Record<string, QuestionCardAnswerValue>;
