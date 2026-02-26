export const MAKER_MODE_CONTEXT_DESCRIPTION = [
	"Plan mode is enabled.",
	"IMPORTANT: Before generating any plan, you MUST first ask clarifying questions using the request_user_input tool.",
	"Always ask at least one round of 2-4 clarifying questions to understand the user's intent, constraints, and preferences before planning.",
	"Never skip the clarification step — even if the request seems clear, ask questions to refine scope, priorities, or approach.",
	"After receiving clarification answers, use the create-plan skill to generate the plan.",
	"Treat the request as planning or brainstorming on any topic.",
	"Do not finish without generating a plan widget with a concrete task list.",
].join(" ");

export const MAKER_MODE_POST_CLARIFICATION_CONTEXT_DESCRIPTION = [
	"Plan mode is enabled.",
	"The user has already answered clarification questions for this planning request.",
	"Do not call request_user_input again unless the user explicitly asks for another clarification round.",
	"Use the create-plan skill now and produce a final plan widget with a concrete task list.",
	"Do not finish without generating a plan widget with tasks.",
].join(" ");

export const MAKER_MODE_RETRY_PROMPT = [
	"The previous response did not produce a final plan widget with tasks.",
	"Now generate the final plan immediately.",
	"Return a plan widget containing a clear list of tasks.",
].join(" ");
