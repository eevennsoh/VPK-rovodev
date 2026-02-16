import type { Spec } from "@json-render/react";

export const solarSystemSpec: Spec = {
	root: "root",
	elements: {
		root: {
			type: "Stack",
			props: { direction: "vertical", gap: 6 },
			children: ["heading", "description", "scene"],
		},
		heading: {
			type: "Heading",
			props: { level: "h2", text: "Solar System" },
		},
		description: {
			type: "Text",
			props: {
				text: "A 3D solar system scene with orbiting planets, rendered via React Three Fiber. Use mouse to orbit, scroll to zoom.",
				variant: "body",
			},
		},
		scene: {
			type: "Scene3D",
			props: {
				background: "#0a0a1a",
				cameraPosition: [0, 8, 16] as [number, number, number],
				height: "500px",
				orbitControls: true,
			},
			children: ["stars", "ambientLight", "sunLight", "sun", "sunLabel", "mercuryOrbit", "venusOrbit", "earthOrbit", "marsOrbit", "jupiterOrbit"],
		},
		stars: {
			type: "Stars",
			props: { count: 3000, radius: 80, depth: 40 },
		},
		ambientLight: {
			type: "AmbientLight",
			props: { intensity: 0.3, color: "#ffffff" },
		},
		sunLight: {
			type: "PointLight",
			props: { position: [0, 0, 0] as [number, number, number], intensity: 2, color: "#fbbf24" },
		},
		sun: {
			type: "Sphere",
			props: { position: [0, 0, 0] as [number, number, number], radius: 1.2, color: "#fbbf24" },
		},
		sunLabel: {
			type: "Label3D",
			props: { text: "Sun", position: [0, 2, 0] as [number, number, number], color: "#fbbf24", fontSize: 0.5 },
		},
		// Mercury orbit
		mercuryOrbit: {
			type: "Group3D",
			props: { animate: { rotateY: 4.1 } },
			children: ["mercury", "mercuryLabel"],
		},
		mercury: {
			type: "Sphere",
			props: { position: [2.5, 0, 0] as [number, number, number], radius: 0.2, color: "#a3a3a3" },
		},
		mercuryLabel: {
			type: "Label3D",
			props: { text: "Mercury", position: [2.5, 0.6, 0] as [number, number, number], color: "#a3a3a3", fontSize: 0.3 },
		},
		// Venus orbit
		venusOrbit: {
			type: "Group3D",
			props: { animate: { rotateY: 1.6 } },
			children: ["venus", "venusLabel"],
		},
		venus: {
			type: "Sphere",
			props: { position: [4, 0, 0] as [number, number, number], radius: 0.35, color: "#f59e0b" },
		},
		venusLabel: {
			type: "Label3D",
			props: { text: "Venus", position: [4, 0.8, 0] as [number, number, number], color: "#f59e0b", fontSize: 0.3 },
		},
		// Earth orbit
		earthOrbit: {
			type: "Group3D",
			props: { animate: { rotateY: 1.0 } },
			children: ["earth", "earthLabel"],
		},
		earth: {
			type: "Sphere",
			props: { position: [5.5, 0, 0] as [number, number, number], radius: 0.4, color: "#3b82f6" },
		},
		earthLabel: {
			type: "Label3D",
			props: { text: "Earth", position: [5.5, 0.9, 0] as [number, number, number], color: "#3b82f6", fontSize: 0.3 },
		},
		// Mars orbit
		marsOrbit: {
			type: "Group3D",
			props: { animate: { rotateY: 0.53 } },
			children: ["mars", "marsLabel"],
		},
		mars: {
			type: "Sphere",
			props: { position: [7.5, 0, 0] as [number, number, number], radius: 0.3, color: "#ef4444" },
		},
		marsLabel: {
			type: "Label3D",
			props: { text: "Mars", position: [7.5, 0.8, 0] as [number, number, number], color: "#ef4444", fontSize: 0.3 },
		},
		// Jupiter orbit
		jupiterOrbit: {
			type: "Group3D",
			props: { animate: { rotateY: 0.08 } },
			children: ["jupiter", "jupiterLabel"],
		},
		jupiter: {
			type: "Sphere",
			props: { position: [10, 0, 0] as [number, number, number], radius: 0.8, color: "#d97706" },
		},
		jupiterLabel: {
			type: "Label3D",
			props: { text: "Jupiter", position: [10, 1.4, 0] as [number, number, number], color: "#d97706", fontSize: 0.3 },
		},
	},
};
