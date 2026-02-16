import type { Spec } from "@json-render/react";

export const teamProfileSpec: Spec = {
	root: "root",
	elements: {
		root: {
			type: "Stack",
			props: { direction: "vertical", gap: "lg" },
			children: ["header", "metricsRow", "teamGrid"],
		},
		header: {
			type: "PageHeader",
			props: { title: "Platform Engineering", description: "Core infrastructure and developer tools team" },
		},
		metricsRow: {
			type: "Grid",
			props: { columns: "4", gap: "md" },
			children: ["metricMembers", "metricSprints", "metricVelocity", "metricCompletion"],
		},
		metricMembers: {
			type: "Metric",
			props: { label: "Team Members", value: "8", trend: "neutral" },
		},
		metricSprints: {
			type: "Metric",
			props: { label: "Sprints Completed", value: "24", detail: "+3", trend: "up" },
		},
		metricVelocity: {
			type: "Metric",
			props: { label: "Avg Velocity", value: "42 pts", detail: "+5%", trend: "up" },
		},
		metricCompletion: {
			type: "Metric",
			props: { label: "Sprint Completion", value: "94%", detail: "+2%", trend: "up" },
		},
		teamGrid: {
			type: "Grid",
			props: { columns: "2", gap: "md" },
			children: ["member1", "member2", "member3", "member4", "member5", "member6"],
		},

		member1: {
			type: "Card",
			props: {},
			children: ["member1Stack"],
		},
		member1Stack: {
			type: "Stack",
			props: { direction: "horizontal", gap: "sm", align: "center" },
			children: ["member1Avatar", "member1Info"],
		},
		member1Avatar: {
			type: "Avatar",
			props: { fallback: "JD", size: "lg" },
		},
		member1Info: {
			type: "Stack",
			props: { direction: "vertical", gap: "sm" },
			children: ["member1Name", "member1Role", "member1Status"],
		},
		member1Name: {
			type: "Heading",
			props: { level: "h4", text: "Jordan Davis" },
		},
		member1Role: {
			type: "Text",
			props: { content: "Tech Lead", muted: true },
		},
		member1Status: {
			type: "Lozenge",
			props: { text: "Available", variant: "success" },
		},

		member2: {
			type: "Card",
			props: {},
			children: ["member2Stack"],
		},
		member2Stack: {
			type: "Stack",
			props: { direction: "horizontal", gap: "sm", align: "center" },
			children: ["member2Avatar", "member2Info"],
		},
		member2Avatar: {
			type: "Avatar",
			props: { fallback: "AS", size: "lg" },
		},
		member2Info: {
			type: "Stack",
			props: { direction: "vertical", gap: "sm" },
			children: ["member2Name", "member2Role", "member2Status"],
		},
		member2Name: {
			type: "Heading",
			props: { level: "h4", text: "Aisha Singh" },
		},
		member2Role: {
			type: "Text",
			props: { content: "Senior Engineer", muted: true },
		},
		member2Status: {
			type: "Lozenge",
			props: { text: "In Meeting", variant: "information" },
		},

		member3: {
			type: "Card",
			props: {},
			children: ["member3Stack"],
		},
		member3Stack: {
			type: "Stack",
			props: { direction: "horizontal", gap: "sm", align: "center" },
			children: ["member3Avatar", "member3Info"],
		},
		member3Avatar: {
			type: "Avatar",
			props: { fallback: "MK", size: "lg" },
		},
		member3Info: {
			type: "Stack",
			props: { direction: "vertical", gap: "sm" },
			children: ["member3Name", "member3Role", "member3Status"],
		},
		member3Name: {
			type: "Heading",
			props: { level: "h4", text: "Marcus Kim" },
		},
		member3Role: {
			type: "Text",
			props: { content: "Backend Engineer", muted: true },
		},
		member3Status: {
			type: "Lozenge",
			props: { text: "Available", variant: "success" },
		},

		member4: {
			type: "Card",
			props: {},
			children: ["member4Stack"],
		},
		member4Stack: {
			type: "Stack",
			props: { direction: "horizontal", gap: "sm", align: "center" },
			children: ["member4Avatar", "member4Info"],
		},
		member4Avatar: {
			type: "Avatar",
			props: { fallback: "EW", size: "lg" },
		},
		member4Info: {
			type: "Stack",
			props: { direction: "vertical", gap: "sm" },
			children: ["member4Name", "member4Role", "member4Status"],
		},
		member4Name: {
			type: "Heading",
			props: { level: "h4", text: "Elena Wu" },
		},
		member4Role: {
			type: "Text",
			props: { content: "Frontend Engineer", muted: true },
		},
		member4Status: {
			type: "Lozenge",
			props: { text: "Focus Time", variant: "warning" },
		},

		member5: {
			type: "Card",
			props: {},
			children: ["member5Stack"],
		},
		member5Stack: {
			type: "Stack",
			props: { direction: "horizontal", gap: "sm", align: "center" },
			children: ["member5Avatar", "member5Info"],
		},
		member5Avatar: {
			type: "Avatar",
			props: { fallback: "RP", size: "lg" },
		},
		member5Info: {
			type: "Stack",
			props: { direction: "vertical", gap: "sm" },
			children: ["member5Name", "member5Role", "member5Status"],
		},
		member5Name: {
			type: "Heading",
			props: { level: "h4", text: "Raj Patel" },
		},
		member5Role: {
			type: "Text",
			props: { content: "DevOps Engineer", muted: true },
		},
		member5Status: {
			type: "Lozenge",
			props: { text: "On Leave", variant: "danger" },
		},

		member6: {
			type: "Card",
			props: {},
			children: ["member6Stack"],
		},
		member6Stack: {
			type: "Stack",
			props: { direction: "horizontal", gap: "sm", align: "center" },
			children: ["member6Avatar", "member6Info"],
		},
		member6Avatar: {
			type: "Avatar",
			props: { fallback: "CL", size: "lg" },
		},
		member6Info: {
			type: "Stack",
			props: { direction: "vertical", gap: "sm" },
			children: ["member6Name", "member6Role", "member6Status"],
		},
		member6Name: {
			type: "Heading",
			props: { level: "h4", text: "Casey Lee" },
		},
		member6Role: {
			type: "Text",
			props: { content: "QA Engineer", muted: true },
		},
		member6Status: {
			type: "Lozenge",
			props: { text: "Available", variant: "success" },
		},
	},
};
