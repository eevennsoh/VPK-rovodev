"use client";

import React from "react";
import { MakeItemCard } from "./components/make-item-card";
import { MOCK_MAKE_ITEMS } from "./lib/types";

export default function MakeItemPage() {
	return (
		<div className="flex w-full flex-col gap-6 p-6 max-w-5xl mx-auto">
			{MOCK_MAKE_ITEMS.map((item) => (
				<MakeItemCard key={item.id} item={item} className="h-[240px]" />
			))}
		</div>
	);
}
