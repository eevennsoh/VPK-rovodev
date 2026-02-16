"use client";

import type { Spec } from "@json-render/react";
import { JSONUIProvider, Renderer } from "@json-render/react";
import { registry } from "./registry";

export function JsonRenderView({
	spec,
	loading,
}: {
	spec: Spec | null;
	loading?: boolean;
}) {
	return (
		<JSONUIProvider registry={registry} initialState={spec?.state}>
			<Renderer spec={spec} registry={registry} loading={loading} />
		</JSONUIProvider>
	);
}
