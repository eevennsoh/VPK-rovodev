const test = require("node:test");
const assert = require("node:assert/strict");

const {
	classifyTicket,
	classifyTicketCategory,
	inferPriority,
	countKeywordMatches,
	mapIssueToRawTicket,
	buildClassificationResult,
	buildClassifyJql,
	mapJiraPriority,
	resolveLimit,
	createHttpError,
	extractTextFromAdf,
	TICKET_CATEGORIES,
	CATEGORY_KEYWORDS,
	CATEGORY_TEAM_ROUTES,
} = require("./ticket-classifier");

// ── countKeywordMatches ─────────────────────────────────────────────────────

test("countKeywordMatches — counts matching keywords", () => {
	assert.equal(countKeywordMatches("invoice payment refund", ["invoice", "payment", "refund"]), 3);
	assert.equal(countKeywordMatches("invoice payment", ["invoice", "payment", "refund"]), 2);
	assert.equal(countKeywordMatches("nothing here", ["invoice", "payment"]), 0);
});

test("countKeywordMatches — case insensitive", () => {
	assert.equal(countKeywordMatches("INVOICE Payment", ["invoice", "payment"]), 2);
});

test("countKeywordMatches — handles multi-word keywords", () => {
	assert.equal(countKeywordMatches("I need to reset password", ["reset password"]), 1);
	assert.equal(countKeywordMatches("getting started guide", ["getting started"]), 1);
});

test("countKeywordMatches — handles empty/null text", () => {
	assert.equal(countKeywordMatches("", ["invoice"]), 0);
	assert.equal(countKeywordMatches(null, ["invoice"]), 0);
	assert.equal(countKeywordMatches(undefined, ["invoice"]), 0);
});

// ── classifyTicketCategory ──────────────────────────────────────────────────

test("classifyTicketCategory — billing ticket", () => {
	const ticket = {
		summary: "Incorrect charge on my subscription invoice",
		description: "I was charged twice for my monthly subscription. Please issue a refund.",
		labels: [],
		components: [],
	};
	const result = classifyTicketCategory(ticket);
	assert.equal(result.category, "billing");
	assert.ok(result.confidence > 0.5, "Confidence should be above 50%");
});

test("classifyTicketCategory — account ticket", () => {
	const ticket = {
		summary: "Cannot login after resetting my password",
		description: "SSO authentication fails. My account is locked out and MFA is not working.",
		labels: [],
		components: [],
	};
	const result = classifyTicketCategory(ticket);
	assert.equal(result.category, "account");
	assert.ok(result.confidence > 0.5);
});

test("classifyTicketCategory — technical ticket", () => {
	const ticket = {
		summary: "Application crashes with 500 error on dashboard",
		description: "Stack trace shows a null pointer exception. Performance is degraded.",
		labels: [],
		components: [],
	};
	const result = classifyTicketCategory(ticket);
	assert.equal(result.category, "technical");
	assert.ok(result.confidence > 0.5);
});

test("classifyTicketCategory — onboarding ticket", () => {
	const ticket = {
		summary: "How do I get started with the platform?",
		description: "New user looking for a quickstart tutorial and initial setup guide.",
		labels: [],
		components: [],
	};
	const result = classifyTicketCategory(ticket);
	assert.equal(result.category, "onboarding");
	assert.ok(result.confidence > 0.5);
});

test("classifyTicketCategory — api-integration ticket", () => {
	const ticket = {
		summary: "API rate limit errors on webhook endpoint",
		description: "Our REST integration is getting 429 errors. OAuth token refresh fails.",
		labels: ["api"],
		components: [],
	};
	const result = classifyTicketCategory(ticket);
	assert.equal(result.category, "api-integration");
	assert.ok(result.confidence > 0.5);
});

test("classifyTicketCategory — documentation ticket", () => {
	const ticket = {
		summary: "Documentation is outdated for the reporting feature",
		description: "The guide and FAQ for reports are missing instructions for the new export.",
		labels: [],
		components: [],
	};
	const result = classifyTicketCategory(ticket);
	assert.equal(result.category, "documentation");
	assert.ok(result.confidence > 0.5);
});

test("classifyTicketCategory — summary weighted more than description", () => {
	// Summary says billing, description says technical
	const ticket = {
		summary: "Payment invoice subscription refund",
		description: "There is a bug with an error causing a crash",
		labels: [],
		components: [],
	};
	const result = classifyTicketCategory(ticket);
	// Summary is 2x weighted, so billing should win
	assert.equal(result.category, "billing");
});

test("classifyTicketCategory — labels boost classification", () => {
	const ticket = {
		summary: "Help with something",
		description: "I need assistance",
		labels: ["api", "integration", "webhook"],
		components: [],
	};
	const result = classifyTicketCategory(ticket);
	assert.equal(result.category, "api-integration");
});

test("classifyTicketCategory — empty ticket defaults to technical", () => {
	const ticket = {
		summary: "",
		description: "",
		labels: [],
		components: [],
	};
	const result = classifyTicketCategory(ticket);
	assert.equal(result.category, "technical");
	assert.equal(result.confidence, 0);
});

test("classifyTicketCategory — allScores covers all categories", () => {
	const ticket = {
		summary: "invoice payment issue",
		description: "",
		labels: [],
		components: [],
	};
	const result = classifyTicketCategory(ticket);
	for (const cat of TICKET_CATEGORIES) {
		assert.ok(cat in result.allScores, `Missing category ${cat} in allScores`);
		assert.equal(typeof result.allScores[cat], "number");
	}
});

// ── inferPriority ───────────────────────────────────────────────────────────

test("inferPriority — maps Jira priority", () => {
	assert.equal(inferPriority({ summary: "", description: "", priority: "High" }), "P2");
	assert.equal(inferPriority({ summary: "", description: "", priority: "Medium" }), "P3");
	assert.equal(inferPriority({ summary: "", description: "", priority: "Low" }), "P4");
});

test("inferPriority — critical keywords upgrade to P1", () => {
	const ticket = {
		summary: "URGENT: production down",
		description: "Critical outage affecting all users",
		priority: "Medium",
	};
	assert.equal(inferPriority(ticket), "P1");
});

test("inferPriority — high keywords upgrade to at least P2", () => {
	const ticket = {
		summary: "Important: affecting multiple teams",
		description: "This is a major issue",
		priority: "Low",
	};
	assert.equal(inferPriority(ticket), "P2");
});

test("inferPriority — low keywords downgrade to P4", () => {
	const ticket = {
		summary: "Minor cosmetic issue, no rush",
		description: "Nice to have fix when you get a chance",
		priority: "High",
	};
	assert.equal(inferPriority(ticket), "P4");
});

test("inferPriority — critical keyword beats high keyword", () => {
	const ticket = {
		summary: "URGENT blocker important",
		description: "Critical and major",
		priority: "Low",
	};
	assert.equal(inferPriority(ticket), "P1");
});

// ── mapJiraPriority ─────────────────────────────────────────────────────────

test("mapJiraPriority — maps known priorities", () => {
	assert.equal(mapJiraPriority("Blocker"), "P1");
	assert.equal(mapJiraPriority("Critical"), "P1");
	assert.equal(mapJiraPriority("High"), "P2");
	assert.equal(mapJiraPriority("Medium"), "P3");
	assert.equal(mapJiraPriority("Low"), "P4");
	assert.equal(mapJiraPriority("Trivial"), "P4");
});

test("mapJiraPriority — case insensitive", () => {
	assert.equal(mapJiraPriority("HIGH"), "P2");
	assert.equal(mapJiraPriority("  medium  "), "P3");
});

test("mapJiraPriority — unknown defaults to P3", () => {
	assert.equal(mapJiraPriority("Unknown Priority"), "P3");
	assert.equal(mapJiraPriority(""), "P3");
	assert.equal(mapJiraPriority(null), "P3");
});

// ── extractTextFromAdf ──────────────────────────────────────────────────────

test("extractTextFromAdf — extracts text from simple ADF", () => {
	const adf = {
		type: "doc",
		content: [
			{
				type: "paragraph",
				content: [
					{ type: "text", text: "Hello " },
					{ type: "text", text: "world" },
				],
			},
		],
	};
	assert.equal(extractTextFromAdf(adf), "Hello  world");
});

test("extractTextFromAdf — handles nested structure", () => {
	const adf = {
		type: "doc",
		content: [
			{
				type: "paragraph",
				content: [{ type: "text", text: "Payment failed" }],
			},
			{
				type: "paragraph",
				content: [{ type: "text", text: "Please refund" }],
			},
		],
	};
	const result = extractTextFromAdf(adf);
	assert.ok(result.includes("Payment failed"));
	assert.ok(result.includes("Please refund"));
});

test("extractTextFromAdf — handles null/empty", () => {
	assert.equal(extractTextFromAdf(null), "");
	assert.equal(extractTextFromAdf(undefined), "");
	assert.equal(extractTextFromAdf({}), "");
	assert.equal(extractTextFromAdf("string"), "");
});

// ── mapIssueToRawTicket ─────────────────────────────────────────────────────

test("mapIssueToRawTicket — maps complete Jira issue", () => {
	const issue = {
		key: "SUPPORT-42",
		fields: {
			summary: "Payment failed",
			description: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "My invoice was wrong" }] }] },
			status: { name: "Open" },
			priority: { name: "High" },
			issuetype: { name: "Bug" },
			assignee: { displayName: "Jane Doe" },
			reporter: { displayName: "John Smith" },
			project: { key: "SUPPORT", name: "Support Desk" },
			labels: ["billing", "urgent"],
			components: [{ name: "Payments" }],
			created: "2026-03-01T10:00:00.000Z",
			updated: "2026-03-02T12:00:00.000Z",
		},
	};

	const ticket = mapIssueToRawTicket(issue, "test.atlassian.net");

	assert.equal(ticket.key, "SUPPORT-42");
	assert.equal(ticket.summary, "Payment failed");
	assert.ok(ticket.description.includes("My invoice was wrong"));
	assert.equal(ticket.status, "Open");
	assert.equal(ticket.priority, "High");
	assert.equal(ticket.type, "Bug");
	assert.equal(ticket.assignee, "Jane Doe");
	assert.equal(ticket.reporter, "John Smith");
	assert.equal(ticket.projectKey, "SUPPORT");
	assert.deepEqual(ticket.labels, ["billing", "urgent"]);
	assert.deepEqual(ticket.components, ["Payments"]);
	assert.equal(ticket.url, "https://test.atlassian.net/browse/SUPPORT-42");
});

test("mapIssueToRawTicket — handles missing fields", () => {
	const issue = { key: "TEST-1", fields: {} };
	const ticket = mapIssueToRawTicket(issue, "test.atlassian.net");

	assert.equal(ticket.key, "TEST-1");
	assert.equal(ticket.summary, "");
	assert.equal(ticket.description, "");
	assert.equal(ticket.status, "Unknown");
	assert.equal(ticket.priority, "Medium");
	assert.equal(ticket.assignee, "Unassigned");
	assert.equal(ticket.reporter, "Unknown");
	assert.deepEqual(ticket.labels, []);
	assert.deepEqual(ticket.components, []);
});

// ── classifyTicket ──────────────────────────────────────────────────────────

test("classifyTicket — returns full classified ticket", () => {
	const ticket = {
		key: "SUP-1",
		summary: "Cannot login to my account",
		description: "Password reset is not working. SSO authentication fails.",
		priority: "High",
		labels: [],
		components: [],
	};

	const result = classifyTicket(ticket);

	assert.equal(result.category, "account");
	assert.equal(result.priority, "P2");
	assert.ok(result.confidence > 0);
	assert.ok(result.suggestedTeam);
	assert.equal(result.suggestedTeam.team, "Identity Team");
	assert.ok(result.allScores);
	assert.equal(result.ticket, ticket);
});

test("classifyTicket — routes to correct team per category", () => {
	const categories = {
		billing: { summary: "Invoice refund needed", team: "Finance Ops" },
		account: { summary: "Login password SSO access", team: "Identity Team" },
		technical: { summary: "Bug crash error 500", team: "Engineering" },
		onboarding: { summary: "Setup tutorial getting started", team: "Customer Success" },
		"api-integration": { summary: "API webhook REST endpoint", team: "Platform Team" },
		documentation: { summary: "Documentation guide FAQ how to", team: "Content Team" },
	};

	for (const [cat, { summary, team }] of Object.entries(categories)) {
		const result = classifyTicket({
			summary,
			description: "",
			priority: "Medium",
			labels: [],
			components: [],
		});
		assert.equal(result.category, cat, `Expected ${cat} for "${summary}"`);
		assert.equal(result.suggestedTeam.team, team, `Expected team ${team} for ${cat}`);
	}
});

// ── buildClassificationResult ───────────────────────────────────────────────

test("buildClassificationResult — computes distributions correctly", () => {
	const classified = [
		{ category: "billing", priority: "P1", confidence: 0.9 },
		{ category: "billing", priority: "P2", confidence: 0.8 },
		{ category: "technical", priority: "P1", confidence: 0.7 },
		{ category: "account", priority: "P3", confidence: 0.3 },
	];

	const result = buildClassificationResult(classified, "test.atlassian.net", "SUPPORT");

	assert.equal(result.siteUrl, "test.atlassian.net");
	assert.equal(result.project, "SUPPORT");
	assert.equal(result.totalTickets, 4);
	assert.equal(result.distribution.billing, 2);
	assert.equal(result.distribution.technical, 1);
	assert.equal(result.distribution.account, 1);
	assert.equal(result.distribution.onboarding, 0);
	assert.equal(result.priorityDistribution.P1, 2);
	assert.equal(result.priorityDistribution.P2, 1);
	assert.equal(result.priorityDistribution.P3, 1);
	assert.equal(result.priorityDistribution.P4, 0);
	assert.equal(result.lowConfidenceCount, 1); // 0.3 < 0.5
	assert.equal(typeof result.generatedAt, "string");
});

test("buildClassificationResult — empty input", () => {
	const result = buildClassificationResult([], "test.atlassian.net", "TEST");
	assert.equal(result.totalTickets, 0);
	assert.equal(result.lowConfidenceCount, 0);
	assert.equal(result.distribution.billing, 0);
	assert.equal(result.priorityDistribution.P1, 0);
});

// ── buildClassifyJql ────────────────────────────────────────────────────────

test("buildClassifyJql — default query", () => {
	const jql = buildClassifyJql();
	assert.equal(
		jql,
		'project = "SUPPORT" AND status NOT IN ("Done", "Closed", "Resolved") ORDER BY created DESC',
	);
});

test("buildClassifyJql — custom project", () => {
	const jql = buildClassifyJql({ project: "HELPDESK" });
	assert.equal(
		jql,
		'project = "HELPDESK" AND status NOT IN ("Done", "Closed", "Resolved") ORDER BY created DESC',
	);
});

test("buildClassifyJql — custom excluded statuses", () => {
	const jql = buildClassifyJql({ project: "SUP", excludeStatuses: ["Done"] });
	assert.equal(
		jql,
		'project = "SUP" AND status NOT IN ("Done") ORDER BY created DESC',
	);
});

test("buildClassifyJql — empty excluded statuses", () => {
	const jql = buildClassifyJql({ excludeStatuses: [] });
	assert.equal(jql, 'project = "SUPPORT" ORDER BY created DESC');
});

// ── resolveLimit ────────────────────────────────────────────────────────────

test("resolveLimit — defaults to 25", () => {
	assert.equal(resolveLimit(), 25);
	assert.equal(resolveLimit(undefined), 25);
	assert.equal(resolveLimit(null), 25);
});

test("resolveLimit — clamps to 1-100 range", () => {
	assert.equal(resolveLimit(0), 1);
	assert.equal(resolveLimit(-5), 1);
	assert.equal(resolveLimit(200), 100);
	assert.equal(resolveLimit(50), 50);
});

test("resolveLimit — handles non-numeric", () => {
	assert.equal(resolveLimit("abc"), 25);
	assert.equal(resolveLimit(NaN), 25);
	assert.equal(resolveLimit(Infinity), 25);
});

// ── createHttpError ─────────────────────────────────────────────────────────

test("createHttpError — creates Error with statusCode", () => {
	const error = createHttpError(400, "Bad request");
	assert.ok(error instanceof Error);
	assert.equal(error.message, "Bad request");
	assert.equal(error.statusCode, 400);
});

// ── Constants validation ────────────────────────────────────────────────────

test("TICKET_CATEGORIES — has 6 categories", () => {
	assert.equal(TICKET_CATEGORIES.length, 6);
	assert.ok(TICKET_CATEGORIES.includes("billing"));
	assert.ok(TICKET_CATEGORIES.includes("account"));
	assert.ok(TICKET_CATEGORIES.includes("technical"));
	assert.ok(TICKET_CATEGORIES.includes("onboarding"));
	assert.ok(TICKET_CATEGORIES.includes("api-integration"));
	assert.ok(TICKET_CATEGORIES.includes("documentation"));
});

test("CATEGORY_KEYWORDS — every category has keywords", () => {
	for (const cat of TICKET_CATEGORIES) {
		assert.ok(Array.isArray(CATEGORY_KEYWORDS[cat]), `${cat} should have keywords`);
		assert.ok(CATEGORY_KEYWORDS[cat].length > 0, `${cat} should have at least one keyword`);
	}
});

test("CATEGORY_TEAM_ROUTES — every category has a team route", () => {
	for (const cat of TICKET_CATEGORIES) {
		const route = CATEGORY_TEAM_ROUTES[cat];
		assert.ok(route, `${cat} should have a team route`);
		assert.ok(route.team, `${cat} should have a team name`);
		assert.ok(route.emoji, `${cat} should have an emoji`);
		assert.ok(route.description, `${cat} should have a description`);
	}
});
