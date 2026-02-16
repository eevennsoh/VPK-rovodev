import type { Spec } from "@json-render/react";

export const mixedSpec: Spec = {
	root: "root",
	state: {
		performanceData: [
			{ metric: "FCP", value: 1.2, target: 2.0 },
			{ metric: "LCP", value: 2.4, target: 2.5 },
			{ metric: "CLS", value: 0.05, target: 0.1 },
			{ metric: "TBT", value: 180, target: 200 },
		],
	},
	elements: {
		root: {
			type: "Stack",
			props: { direction: "vertical", gap: 6 },
			children: ["heading", "description", "contentGrid"],
		},
		heading: {
			type: "Heading",
			props: { level: "h2", text: "Mixed 2D + 3D" },
		},
		description: {
			type: "Text",
			props: {
				text: "Combining data metrics, charts, and embedded 3D scenes in a single spec. This demonstrates the full range of component types working together.",
				variant: "body",
			},
		},
		contentGrid: {
			type: "Grid",
			props: { columns: 2, gap: 4 },
			children: ["metricsCard", "sceneCard", "timelineCard", "infoCard"],
		},
		metricsCard: {
			type: "Card",
			props: { title: "Web Vitals" },
			children: ["metricsStack"],
		},
		metricsStack: {
			type: "Stack",
			props: { direction: "vertical", gap: 3 },
			children: ["metricFCP", "metricLCP", "metricCLS", "metricTBT"],
		},
		metricFCP: {
			type: "Metric",
			props: { label: "First Contentful Paint", value: "1.2s", change: "Good", changeType: "positive" },
		},
		metricLCP: {
			type: "Metric",
			props: { label: "Largest Contentful Paint", value: "2.4s", change: "Needs Work", changeType: "neutral" },
		},
		metricCLS: {
			type: "Metric",
			props: { label: "Cumulative Layout Shift", value: "0.05", change: "Good", changeType: "positive" },
		},
		metricTBT: {
			type: "Metric",
			props: { label: "Total Blocking Time", value: "180ms", change: "Good", changeType: "positive" },
		},
		sceneCard: {
			type: "Card",
			props: { title: "3D Preview" },
			children: ["scene"],
		},
		scene: {
			type: "Scene3D",
			props: {
				background: "#111827",
				cameraPosition: [4, 3, 5] as [number, number, number],
				height: "280px",
				orbitControls: true,
			},
			children: ["sceneAmbient", "sceneDirectional", "box1", "torus1", "sphere1", "groundPlane"],
		},
		sceneAmbient: {
			type: "AmbientLight",
			props: { intensity: 0.4 },
		},
		sceneDirectional: {
			type: "DirectionalLight",
			props: { position: [5, 5, 5] as [number, number, number], intensity: 1 },
		},
		box1: {
			type: "Box",
			props: { position: [-1.5, 0.5, 0] as [number, number, number], size: [1, 1, 1] as [number, number, number], color: "#6366f1" },
		},
		torus1: {
			type: "Torus",
			props: { position: [0, 0.6, 0] as [number, number, number], radius: 0.6, tube: 0.25, color: "#f43f5e" },
		},
		sphere1: {
			type: "Sphere",
			props: { position: [1.5, 0.5, 0] as [number, number, number], radius: 0.5, color: "#22c55e" },
		},
		groundPlane: {
			type: "Plane",
			props: {
				position: [0, -0.01, 0] as [number, number, number],
				size: [8, 8] as [number, number],
				color: "#1f2937",
				rotation: [-Math.PI / 2, 0, 0] as [number, number, number],
			},
		},
		timelineCard: {
			type: "Card",
			props: { title: "Release Timeline" },
			children: ["timeline"],
		},
		timeline: {
			type: "Timeline",
			props: {
				items: [
					{ title: "v1.0 Alpha", description: "Initial feature set", date: "Jan 2025", status: "completed" as const },
					{ title: "v1.0 Beta", description: "Public beta testing", date: "Mar 2025", status: "completed" as const },
					{ title: "v1.0 Release", description: "General availability", date: "May 2025", status: "current" as const },
					{ title: "v1.1 Planning", description: "Feature roadmap", date: "Jul 2025", status: "upcoming" as const },
				],
			},
		},
		infoCard: {
			type: "Card",
			props: { title: "Quick Links" },
			children: ["infoStack"],
		},
		infoStack: {
			type: "Stack",
			props: { direction: "vertical", gap: 3 },
			children: ["callout", "accordion"],
		},
		callout: {
			type: "Callout",
			props: {
				title: "Tip",
				text: "Use the JSON editor to modify any part of this spec and see changes in real time.",
				type: "info",
			},
		},
		accordion: {
			type: "Accordion",
			props: {
				items: [
					{ title: "What is json-render?", content: "A library by Vercel Labs for rendering structured JSON specs into live React UIs." },
					{ title: "How does 3D work?", content: "3D components use React Three Fiber and Three.js under the hood, wrapped in the same spec format." },
					{ title: "Can I use my own components?", content: "Yes — define a catalog schema and register your React components in a registry." },
				],
			},
		},
	},
};
