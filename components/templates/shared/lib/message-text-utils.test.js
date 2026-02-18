const test = require("node:test");
const assert = require("node:assert/strict");

const {
	extractPlanRenderableText,
	removeActionItemsSection,
} = require("./message-text-utils.ts");

test("removes action items list but preserves surrounding text", () => {
	const input = `Let me load the create-plan skill.

Scope
- In: Agenda and speakers
- Out: Travel bookings

Action items
- [ ] Define event goals and format
- [ ] Establish budget and sponsorship
- [ ] Secure venue and AV setup

Follow-up
Share this plan with stakeholders.`;

	const output = removeActionItemsSection(input);
	assert.equal(
		output,
		`Let me load the create-plan skill.

Scope
- In: Agenda and speakers
- Out: Travel bookings

Follow-up
Share this plan with stakeholders.`
	);
});

test("supports unicode checklist bullets", () => {
	const input = `Plan intro

Action items
\u2022 \u2610 Define event goals and format
\u2022 \u2610 Establish budget and sponsorship`;

	const output = removeActionItemsSection(input);
	assert.equal(output, "Plan intro");
});

test("returns original text when no action items section exists", () => {
	const input = `Scope
- In: Agenda
- Out: Travel`;

	const output = removeActionItemsSection(input);
	assert.equal(output, input);
});

test("extracts mermaid and concise summary for plan rendering", () => {
	const input = `Used expand_folder
Invoking get_skill
Completed get_skill
Great idea! Let me quickly scan.

## Plan

Action items
- [ ] Define milestones
- [ ] Assign owners

\`\`\`mermaid
graph TD
  task_1["Define milestones"]
  task_2["Assign owners"]
  task_1 --> task_2
\`\`\`

This plan is ready to execute.
Share with the onboarding team.`;

	const output = extractPlanRenderableText(input, { maxSummaryLines: 2 });
	assert.equal(
		output.text,
		`\`\`\`mermaid
graph TD
  task_1["Define milestones"]
  task_2["Assign owners"]
  task_1 --> task_2
\`\`\`

This plan is ready to execute.
Share with the onboarding team.`
	);
	assert.equal(
		output.summary,
		`This plan is ready to execute.
Share with the onboarding team.`
	);
});

test("drops plan text when only action items and log lines exist", () => {
	const input = `Used expand_folder
Invoking open_files
Action items
- [ ] Draft onboarding plan
- [ ] Review with HR`;

	const output = extractPlanRenderableText(input);
	assert.equal(output.text, "");
	assert.equal(output.summary, "");
	assert.equal(output.mermaid, "");
});
