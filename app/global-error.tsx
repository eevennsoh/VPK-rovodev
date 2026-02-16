"use client";

import { useEffect } from "react";
import "./globals.css";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";

interface GlobalErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function GlobalError({
	error,
	reset,
}: Readonly<GlobalErrorProps>) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<html lang="en">
			<body className="bg-surface antialiased">
				<div className="flex min-h-svh items-center justify-center px-4 py-8">
					<Empty width="narrow" className="py-0">
						<EmptyHeader>
							<EmptyTitle>Something went wrong</EmptyTitle>
							<EmptyDescription>
								A critical error occurred. Please try again.
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button onClick={reset}>Try again</Button>
						</EmptyContent>
					</Empty>
				</div>
			</body>
		</html>
	);
}
