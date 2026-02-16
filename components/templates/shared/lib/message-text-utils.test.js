const test = require("node:test");
const assert = require("node:assert/strict");

const {
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
