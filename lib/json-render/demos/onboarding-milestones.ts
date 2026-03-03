import type { Spec } from "@json-render/react";

/**
 * Q2 Demo: "What are my key onboarding and benefits milestones in my first 90 days?"
 *
 * Timeline with ordered milestones from start to end period.
 * Uses Timeline component with clear labels and detail rows.
 */
export const onboardingMilestonesSpec: Spec = {
	root: "root",
	state: {},
	elements: {
		root: {
			type: "Stack",
			props: { direction: "vertical", gap: "lg" },
			children: ["heading", "description", "progressTracker", "timeline", "callout"],
		},
		heading: {
			type: "Heading",
			props: { text: "Onboarding & Benefits Milestones", level: "h2" },
		},
		description: {
			type: "Text",
			props: {
				content: "Key milestones and action items for your first 90 days. Complete each step to ensure you are fully set up with benefits, access, and team integration.",
			},
		},
		progressTracker: {
			type: "ProgressBar",
			props: {
				value: 25,
				label: "Onboarding progress",
				appearance: "success",
			},
		},
		timeline: {
			type: "Timeline",
			props: {
				items: [
					{
						title: "Accept offer & complete pre-boarding",
						description: "Sign employment agreement, complete background check, and submit new hire paperwork. Set up direct deposit and tax withholding (W-4).",
						date: "Before Day 1",
						status: "completed",
					},
					{
						title: "Benefits enrollment window opens",
						description: "You have 30 days from your start date to elect medical, dental, vision, life, and disability insurance. Review plan options in the benefits portal.",
						date: "Day 1",
						status: "current",
					},
					{
						title: "IT setup & access provisioning",
						description: "Receive laptop and security badge. Get access to Confluence, Jira, Slack, email, and VPN. Complete mandatory security awareness training.",
						date: "Day 1-2",
						status: "current",
					},
					{
						title: "Meet your team & manager 1:1",
						description: "Introductory meeting with your direct manager to review role expectations, 30/60/90-day goals, and team norms. Meet immediate teammates.",
						date: "Week 1",
						status: "upcoming",
					},
					{
						title: "Complete compliance training",
						description: "Finish required courses: Code of Conduct, Anti-Harassment, Data Privacy (GDPR/CCPA), and Workplace Safety. Tracked in the LMS.",
						date: "Week 1-2",
						status: "upcoming",
					},
					{
						title: "Enroll in retirement plan (401k)",
						description: "Set up 401(k) contributions and select investment allocations. Company match begins after enrollment: 100% match on first 3%, 50% on next 2%.",
						date: "Day 15",
						status: "upcoming",
					},
					{
						title: "Benefits enrollment deadline",
						description: "Last day to finalize your medical, dental, vision, and supplemental insurance elections. After this date, changes require a qualifying life event.",
						date: "Day 30",
						status: "upcoming",
					},
					{
						title: "30-day check-in with manager",
						description: "Review initial progress against 30-day goals. Discuss any blockers, resource needs, and adjust onboarding plan if needed.",
						date: "Day 30",
						status: "upcoming",
					},
					{
						title: "Flexible spending account activation",
						description: "FSA and HSA elections become active. Set up reimbursement claims through the benefits portal. Review eligible expenses.",
						date: "Day 31",
						status: "upcoming",
					},
					{
						title: "60-day performance check-in",
						description: "Mid-probation review with manager. Evaluate progress on 60-day objectives, team collaboration, and identify development areas.",
						date: "Day 60",
						status: "upcoming",
					},
					{
						title: "90-day review & probation completion",
						description: "Final probation review. Confirm role expectations met, discuss career development plan, and set goals for the next quarter. Full benefits confirmed.",
						date: "Day 90",
						status: "upcoming",
					},
				],
			},
		},
		callout: {
			type: "Callout",
			props: {
				type: "info",
				title: "Need help?",
				content: "Contact the People team at people@company.com or visit the HR Help Center in Confluence for detailed benefits guides and FAQ.",
			},
		},
	},
};
