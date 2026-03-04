"use client";

import { use, useState, useEffect, type ComponentType } from "react";
import Link from "next/link";

interface AppsPageProps {
	params: Promise<{ slug: string }>;
}

function loadGeneratedApp(
	slug: string,
): Promise<{ default: ComponentType }> {
	return import(`@/components/generated-apps/${slug}/page`).catch(() => ({
		default: AppNotFound,
	}));
}

function AppNotFound() {
	return (
		<div className="mx-auto flex min-h-svh w-full max-w-[960px] flex-col gap-4 px-4 py-10">
			<div className="rounded-xl border border-border bg-surface p-6">
				<h1 className="text-lg font-semibold text-text">
					App not found
				</h1>
				<p className="mt-2 text-sm text-text-subtle">
					This app may have been deleted or is no longer available.
				</p>
				<div className="mt-5">
					<Link
						href="/make?tab=make"
						className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm text-text hover:bg-bg-neutral-subtle-hovered"
					>
						Back to Make
					</Link>
				</div>
			</div>
		</div>
	);
}

function AppLoading() {
	return (
		<div className="flex min-h-svh items-center justify-center">
			<p className="text-sm text-text-subtle">Loading app...</p>
		</div>
	);
}

export default function GeneratedAppPage({ params }: Readonly<AppsPageProps>) {
	const { slug } = use(params);
	const [AppComponent, setAppComponent] = useState<ComponentType | null>(null);

	useEffect(() => {
		let cancelled = false;
		loadGeneratedApp(slug).then((mod) => {
			if (!cancelled) {
				setAppComponent(() => mod.default);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [slug]);

	if (!AppComponent) {
		return <AppLoading />;
	}

	return <AppComponent />;
}
