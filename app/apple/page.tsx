import type { Metadata } from "next";

const appleVarieties = [
	{
		name: "Honeycrisp",
		description: "Exceptionally crisp with a balanced sweet-tart flavor that works well for snacking.",
		note: "Best for fresh slices",
	},
	{
		name: "Granny Smith",
		description: "Bright, tart, and firm — a classic baking apple that holds its shape beautifully.",
		note: "Best for pies and tarts",
	},
	{
		name: "Fuji",
		description: "Dense, juicy, and very sweet with a long shelf life and reliable crunch.",
		note: "Best for lunch boxes",
	},
	{
		name: "Gala",
		description: "Mildly sweet and aromatic, making it a crowd-pleasing everyday choice.",
		note: "Best for everyday snacking",
	},
];

const nutritionHighlights = [
	"Naturally high in fiber, especially when eaten with the skin.",
	"Rich in vitamin C and plant compounds such as polyphenols.",
	"Hydrating and satisfying while remaining light and versatile.",
];

export const metadata: Metadata = {
	title: "Apple",
	description: "A simple, polished page celebrating apples — their flavor, nutrition, and versatility.",
};

function SectionHeading({ eyebrow, title, description }: Readonly<{ eyebrow: string; title: string; description: string }>) {
	return (
		<div className="max-w-2xl space-y-3">
			<p className="text-sm font-medium uppercase tracking-[0.24em] text-red-700 dark:text-red-300">{eyebrow}</p>
			<h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h2>
			<p className="text-base leading-7 text-muted-foreground sm:text-lg">{description}</p>
		</div>
	);
}

export default function ApplePage() {
	return (
		<main className="min-h-screen bg-background text-foreground">
			<div className="relative isolate overflow-hidden">
				<div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(239,68,68,0.18),_transparent_38%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(255,255,255,1))] dark:bg-[radial-gradient(circle_at_top,_rgba(248,113,113,0.2),_transparent_36%),linear-gradient(180deg,_rgba(9,9,11,0.92),_rgba(9,9,11,1))]" />
				<div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 sm:px-8 sm:py-24 lg:flex-row lg:items-center lg:justify-between lg:px-12">
					<div className="max-w-3xl space-y-8">
						<div className="inline-flex items-center rounded-full border border-red-200/80 bg-white/80 px-4 py-1.5 text-sm font-medium text-red-700 shadow-sm backdrop-blur dark:border-red-500/20 dark:bg-white/5 dark:text-red-300">
							Fruit profile
						</div>
						<div className="space-y-5">
							<h1 className="text-5xl font-semibold tracking-[-0.04em] text-balance sm:text-6xl lg:text-7xl">
								Apple, the everyday fruit with remarkable range.
							</h1>
							<p className="max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
								Crisp, aromatic, and endlessly useful, apples move easily from breakfast tables to bakery counters.
								This page offers a quick look at why they remain one of the world’s most loved fruits.
							</p>
						</div>
						<div className="flex flex-wrap gap-3">
							<div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
								<p className="text-sm text-muted-foreground">Taste</p>
								<p className="text-lg font-semibold">Sweet to tart</p>
							</div>
							<div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
								<p className="text-sm text-muted-foreground">Texture</p>
								<p className="text-lg font-semibold">Juicy and crisp</p>
							</div>
							<div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
								<p className="text-sm text-muted-foreground">Best known for</p>
								<p className="text-lg font-semibold">Snacking and baking</p>
							</div>
						</div>
					</div>

					<div className="w-full max-w-md">
						<div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-white/5">
							<div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-red-400/20 blur-3xl dark:bg-red-500/20" />
							<div className="relative space-y-6">
								<div className="flex items-start justify-between gap-4">
									<div>
										<p className="text-sm font-medium text-muted-foreground">Seasonality</p>
										<p className="mt-2 text-2xl font-semibold">Late summer through fall</p>
									</div>
									<div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-3xl shadow-lg shadow-red-500/25">
										🍎
									</div>
								</div>
								<div className="grid gap-3 sm:grid-cols-2">
									<div className="rounded-2xl bg-red-50 p-4 dark:bg-red-500/10">
										<p className="text-sm text-muted-foreground">Botanical family</p>
										<p className="mt-1 font-semibold">Rosaceae</p>
									</div>
									<div className="rounded-2xl bg-orange-50 p-4 dark:bg-orange-500/10">
										<p className="text-sm text-muted-foreground">Popular uses</p>
										<p className="mt-1 font-semibold">Fresh, baked, juiced</p>
									</div>
								</div>
								<p className="text-sm leading-6 text-muted-foreground">
									Apples are cultivated worldwide and appear in countless regional dishes, from rustic pies to bright salads
									and slow-cooked sauces.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<section className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-12">
				<SectionHeading
					eyebrow="Nutrition"
					title="Why apples are such an easy healthy choice"
					description="Apples are approachable, portable, and nutritionally useful. They pair well with both balanced meals and simple snacks."
				/>
				<div className="mt-10 grid gap-4 md:grid-cols-3">
					{nutritionHighlights.map((item) => (
						<div key={item} className="rounded-3xl border border-border bg-card p-6 shadow-sm">
							<div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300">
								✓
							</div>
							<p className="text-base leading-7 text-card-foreground">{item}</p>
						</div>
					))}
				</div>
			</section>

			<section className="border-y border-border bg-muted/30">
				<div className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-12">
					<SectionHeading
						eyebrow="Varieties"
						title="A few favorite apples"
						description="Different apples shine in different situations, whether you want bright acidity, firm texture, or a sweeter finish."
					/>
					<div className="mt-10 grid gap-5 lg:grid-cols-2">
						{appleVarieties.map((apple) => (
							<article key={apple.name} className="rounded-3xl border border-border bg-background p-6 shadow-sm transition-transform duration-200 hover:-translate-y-0.5">
								<div className="flex items-start justify-between gap-4">
									<div>
										<h3 className="text-2xl font-semibold tracking-tight">{apple.name}</h3>
										<p className="mt-3 text-base leading-7 text-muted-foreground">{apple.description}</p>
									</div>
									<span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
										{apple.note}
									</span>
								</div>
							</article>
						))}
					</div>
				</div>
			</section>

			<section className="mx-auto max-w-6xl px-6 py-16 sm:px-8 lg:px-12">
				<SectionHeading
					eyebrow="In the kitchen"
					title="Simple ways to enjoy apples"
					description="Apples adapt well to quick snacks, savory dishes, and desserts, which helps explain their lasting popularity."
				/>
				<div className="mt-10 grid gap-4 md:grid-cols-3">
					<div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
						<h3 className="text-xl font-semibold">Fresh</h3>
						<p className="mt-3 text-base leading-7 text-muted-foreground">
							Slice with nut butter, add to salads, or enjoy on its own for a crisp snack.
						</p>
					</div>
					<div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
						<h3 className="text-xl font-semibold">Baked</h3>
						<p className="mt-3 text-base leading-7 text-muted-foreground">
							Use firm varieties in pies, crumbles, galettes, or roasted side dishes.
						</p>
					</div>
					<div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
						<h3 className="text-xl font-semibold">Cooked down</h3>
						<p className="mt-3 text-base leading-7 text-muted-foreground">
							Turn them into applesauce, compote, or a glossy filling for pastries and oatmeal.
						</p>
					</div>
				</div>
			</section>
		</main>
	);
}
