"use client";

import { use } from "react";
import FutureChatPage from "@/components/projects/future-chat/page";

interface FutureChatThreadPageProps {
	params: Promise<{ id: string }>;
}

export default function FutureChatThreadPage({
	params,
}: Readonly<FutureChatThreadPageProps>) {
	const { id } = use(params);
	return <FutureChatPage initialThreadId={id} />;
}
