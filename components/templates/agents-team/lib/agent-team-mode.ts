export const AGENT_TEAM_MODE_CONTEXT_DESCRIPTION = [
	"Agent team mode is enabled.",
	"Start straight in the planning phase.",
	"Always use the create-plan skill for this request.",
	"Treat the request as planning or brainstorming on any topic.",
	"Clarification is optional; if needed, ask via a question-card widget.",
	"After any clarification answers, continue and finish the plan.",
	"Do not finish without generating a plan widget with a concrete task list.",
].join(" ");

export const AGENT_TEAM_MODE_PLAN_RETRY_PROMPT = [
	"The previous response did not produce a final plan widget with tasks.",
	"Now generate the final plan immediately.",
	"Return a plan widget containing a clear list of tasks.",
].join(" ");
