"use client";

import { type ReactNode, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type * as THREE from "three";

function AnimatedGroups({ children }: { children?: ReactNode }) {
	const groupRef = useRef<THREE.Group>(null);

	useFrame((_, delta) => {
		if (!groupRef.current) return;
		groupRef.current.traverse((obj) => {
			const animate = obj.userData?.animate as { rotateY?: number; rotateX?: number } | undefined;
			if (!animate) return;
			if (animate.rotateY) obj.rotation.y += animate.rotateY * delta;
			if (animate.rotateX) obj.rotation.x += animate.rotateX * delta;
		});
	});

	return <group ref={groupRef}>{children}</group>;
}

interface Scene3DProps {
	background?: string;
	cameraPosition?: [number, number, number];
	height?: string;
	orbitControls?: boolean;
}

export default function Scene3DComponent({
	props,
	children,
}: {
	props: Scene3DProps;
	children?: ReactNode;
}) {
	const { background, cameraPosition, height = "400px", orbitControls = true } = props;

	return (
		<div className="w-full rounded-lg overflow-hidden" style={{ height }}>
			<Canvas
				camera={{ position: cameraPosition ?? [0, 5, 10], fov: 50 }}
				style={{ background: background ?? "#111827" }}
			>
				{orbitControls ? <OrbitControls enableDamping dampingFactor={0.1} /> : null}
				<AnimatedGroups>{children}</AnimatedGroups>
			</Canvas>
		</div>
	);
}
