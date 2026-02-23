export type QuestionCardPrimaryAction = "skip" | "submit";

/**
 * Keep Skip as the primary CTA until every question has an answer.
 * Once complete, switch the primary CTA to Submit.
 */
export function getQuestionCardPrimaryAction(
	allQuestionsAnswered: boolean
): QuestionCardPrimaryAction {
	return allQuestionsAnswered ? "submit" : "skip";
}
