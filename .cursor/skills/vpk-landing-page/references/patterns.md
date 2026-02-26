# Landing Page Patterns Reference

Comprehensive patterns, layout variations, and techniques for building landing pages in VPK.

## Typography Scale

Establish a clear visual hierarchy with consistent type sizing:

| Element | Mobile | Desktop | Weight | Token |
|---------|--------|---------|--------|-------|
| Page headline | `text-3xl` (30px) | `text-5xl` (48px) or `text-6xl` (60px) | `font-bold` | `text-text` |
| Section headline | `text-2xl` (24px) | `text-3xl` (30px) or `text-4xl` (36px) | `font-bold` or `font-semibold` | `text-text` |
| Subheadline | `text-lg` (18px) | `text-xl` (20px) or `text-2xl` (24px) | `font-medium` | `text-text` |
| Body / description | `text-base` (16px) | `text-lg` (18px) | `font-normal` | `text-text-subtle` |
| Caption / meta | `text-sm` (14px) | `text-sm` (14px) | `font-normal` | `text-text-subtlest` |
| Overline / label | `text-xs` (12px) | `text-sm` (14px) | `font-semibold uppercase tracking-wider` | `text-text-subtle` |

## Spacing System

Maintain consistent rhythm between sections and elements:

| Context | Recommended Spacing |
|---------|---------------------|
| Between major sections | `py-16` to `py-24` (64–96px) |
| Section header to content | `mt-10` to `mt-12` (40–48px) |
| Between cards in a grid | `gap-6` to `gap-8` (24–32px) |
| Between elements within a card | `gap-3` to `gap-4` (12–16px) |
| Inline button groups | `gap-3` to `gap-4` (12–16px) |
| Max content width | `max-w-6xl` (1152px) or `max-w-7xl` (1280px) |
| Section horizontal padding | `px-6` (24px), `sm:px-8`, `lg:px-12` |

## Hero Section Variations

### Centered Hero (Default)

Best for: SaaS products, app launches, simple announcements.

```tsx
<section className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-24 text-center">
	<Badge variant="outline" className="mb-6">✨ Announcing v2.0</Badge>
	<h1 className="max-w-4xl text-4xl font-bold tracking-tight text-text sm:text-5xl lg:text-6xl">
		Build faster with intelligent automation
	</h1>
	<p className="mt-6 max-w-2xl text-lg text-text-subtle sm:text-xl">
		Description that expands on the value proposition in one to two sentences.
	</p>
	<div className="mt-10 flex flex-col gap-4 sm:flex-row">
		<Button size="lg">Start Free Trial</Button>
		<Button size="lg" variant="outline">Watch Demo</Button>
	</div>
</section>
```

### Split Hero (Image + Text)

Best for: Products with strong visual demos, app screenshots.

```tsx
<section className="px-6 py-20 lg:py-28">
	<div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
		<div>
			<Badge variant="default" className="mb-4">New</Badge>
			<h1 className="text-4xl font-bold tracking-tight text-text lg:text-5xl">
				Headline with product value
			</h1>
			<p className="mt-6 text-lg text-text-subtle">
				Supporting description.
			</p>
			<div className="mt-8 flex flex-col gap-4 sm:flex-row">
				<Button size="lg">Get Started</Button>
				<Button size="lg" variant="ghost">Learn More →</Button>
			</div>
		</div>
		<div className="relative">
			<Image
				src="/placeholder-hero.png"
				alt="Product screenshot"
				width={600}
				height={400}
				className="rounded-lg shadow-lg"
			/>
		</div>
	</div>
</section>
```

### Hero with Background Gradient

Best for: Bold, attention-grabbing launch pages.

```tsx
<section className="relative overflow-hidden px-6 py-24 text-center">
	<div className="absolute inset-0 bg-gradient-to-br from-[var(--ds-background-brand-bold)] to-[var(--ds-background-brand-boldest)]" />
	<div className="relative z-10 mx-auto max-w-4xl">
		<h1 className="text-4xl font-bold tracking-tight text-text-inverse sm:text-5xl lg:text-6xl">
			Bold headline on brand background
		</h1>
		<p className="mt-6 text-lg text-text-inverse opacity-90">
			Supporting text with slightly reduced opacity for hierarchy.
		</p>
		<Button size="lg" variant="secondary" className="mt-10">
			Primary Action
		</Button>
	</div>
</section>
```

## Feature Section Variations

### Icon Feature Grid

```tsx
<section className="bg-surface-raised px-6 py-20">
	<div className="mx-auto max-w-6xl">
		<div className="text-center">
			<h2 className="text-3xl font-bold text-text">Everything you need</h2>
			<p className="mt-4 max-w-2xl mx-auto text-text-subtle">
				Section description.
			</p>
		</div>
		<div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
			{features.map((f) => (
				<div key={f.title} className="flex flex-col items-start gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-brand-bold">
						<Icon label="" UNSAFE_size={20} className="text-icon-inverse" />
					</div>
					<h3 className="text-lg font-semibold text-text">{f.title}</h3>
					<p className="text-text-subtle">{f.description}</p>
				</div>
			))}
		</div>
	</div>
</section>
```

### Alternating Feature Rows

Best for: Detailed feature explanations with screenshots.

```tsx
{features.map((feature, i) => (
	<section key={feature.title} className="px-6 py-16">
		<div className={cn(
			"mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2",
			i % 2 === 1 ? "lg:direction-rtl" : ""
		)}>
			<div className={cn(i % 2 === 1 ? "lg:direction-ltr" : "")}>
				<h3 className="text-2xl font-bold text-text">{feature.title}</h3>
				<p className="mt-4 text-text-subtle">{feature.description}</p>
			</div>
			<Image
				src={feature.image}
				alt={feature.title}
				width={560}
				height={380}
				className="rounded-lg border border-border shadow-sm"
			/>
		</div>
	</section>
))}
```

## Social Proof Section

### Logo Bar

```tsx
<section className="border-y border-border px-6 py-12">
	<div className="mx-auto max-w-6xl">
		<p className="mb-8 text-center text-sm font-medium uppercase tracking-wider text-text-subtlest">
			Trusted by leading teams
		</p>
		<div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60 grayscale">
			{logos.map((logo) => (
				<Image key={logo.name} src={logo.src} alt={logo.name} width={120} height={40} />
			))}
		</div>
	</div>
</section>
```

### Testimonial Cards

```tsx
<section className="px-6 py-20">
	<div className="mx-auto max-w-6xl">
		<h2 className="text-center text-3xl font-bold text-text">What people say</h2>
		<div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
			{testimonials.map((t) => (
				<Card key={t.name} className="p-6">
					<blockquote className="text-text-subtle">&ldquo;{t.quote}&rdquo;</blockquote>
					<div className="mt-4 flex items-center gap-3">
						<Avatar>
							<AvatarImage src={t.avatar} alt={t.name} />
							<AvatarFallback>{t.initials}</AvatarFallback>
						</Avatar>
						<div>
							<p className="font-medium text-text">{t.name}</p>
							<p className="text-sm text-text-subtlest">{t.role}</p>
						</div>
					</div>
				</Card>
			))}
		</div>
	</div>
</section>
```

## Pricing Section

### Pricing Cards

```tsx
<section className="px-6 py-20">
	<div className="mx-auto max-w-5xl">
		<div className="text-center">
			<h2 className="text-3xl font-bold text-text">Simple pricing</h2>
			<p className="mt-4 text-text-subtle">No hidden fees. Cancel anytime.</p>
		</div>
		<div className="mt-12 grid gap-8 lg:grid-cols-3">
			{plans.map((plan) => (
				<Card
					key={plan.name}
					className={cn(
						"flex flex-col p-8",
						plan.featured ? "border-2 border-border-brand ring-1 ring-border-brand" : ""
					)}
				>
					{plan.featured ? (
						<Badge className="mb-4 w-fit">Most Popular</Badge>
					) : null}
					<h3 className="text-xl font-semibold text-text">{plan.name}</h3>
					<p className="mt-2 text-text-subtle">{plan.description}</p>
					<div className="mt-6">
						<span className="text-4xl font-bold text-text">${plan.price}</span>
						<span className="text-text-subtle">/month</span>
					</div>
					<ul className="mt-6 flex flex-col gap-3">
						{plan.features.map((f) => (
							<li key={f} className="flex items-center gap-2 text-sm text-text-subtle">
								<CheckMarkIcon label="" UNSAFE_size={16} className="text-icon-success" />
								{f}
							</li>
						))}
					</ul>
					<Button
						className="mt-8"
						variant={plan.featured ? "default" : "outline"}
						size="lg"
					>
						{plan.cta}
					</Button>
				</Card>
			))}
		</div>
	</div>
</section>
```

## FAQ Section

```tsx
<section className="px-6 py-20">
	<div className="mx-auto max-w-3xl">
		<h2 className="text-center text-3xl font-bold text-text">Frequently asked questions</h2>
		<Accordion type="single" collapsible className="mt-12">
			{faqs.map((faq, i) => (
				<AccordionItem key={i} value={`faq-${i}`}>
					<AccordionTrigger>{faq.question}</AccordionTrigger>
					<AccordionContent>{faq.answer}</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
	</div>
</section>
```

## Footer Section

```tsx
<footer className="border-t border-border px-6 py-12">
	<div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
		<div>
			<h4 className="font-semibold text-text">Product</h4>
			<ul className="mt-4 flex flex-col gap-2">
				<li><a href="#" className="text-sm text-text-subtle hover:text-text">Features</a></li>
				<li><a href="#" className="text-sm text-text-subtle hover:text-text">Pricing</a></li>
				<li><a href="#" className="text-sm text-text-subtle hover:text-text">Changelog</a></li>
			</ul>
		</div>
		{/* Repeat for other columns: Company, Resources, Legal */}
	</div>
	<div className="mx-auto mt-12 max-w-6xl border-t border-border pt-8">
		<p className="text-sm text-text-subtlest">© 2026 Company. All rights reserved.</p>
	</div>
</footer>
```

## Animation Recipes

### Fade-in on Scroll (CSS-only)

```css
@keyframes fade-in-up {
	from {
		opacity: 0;
		transform: translateY(20px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.animate-fade-in-up {
	animation: fade-in-up 0.6s ease-out both;
}
```

### Staggered Children (with Motion)

```tsx
import { motion } from "motion/react";

<motion.div
	initial={{ opacity: 0, y: 20 }}
	whileInView={{ opacity: 1, y: 0 }}
	viewport={{ once: true, margin: "-100px" }}
	transition={{ duration: 0.5, delay: index * 0.1 }}
>
	{child}
</motion.div>
```

### Smooth Section Entrance

```tsx
<motion.section
	initial={{ opacity: 0 }}
	whileInView={{ opacity: 1 }}
	viewport={{ once: true }}
	transition={{ duration: 0.8 }}
>
	{/* Section content */}
</motion.section>
```

## Accessibility Checklist

- [ ] All images have descriptive `alt` text
- [ ] Color contrast meets WCAG AA (4.5:1 for body text, 3:1 for large text)
- [ ] Interactive elements are keyboard accessible (Tab, Enter, Space)
- [ ] Focus indicators are visible on all focusable elements
- [ ] Heading hierarchy is logical (h1 → h2 → h3, no skipping)
- [ ] CTAs have descriptive button text (not just "Click here")
- [ ] Form inputs have associated labels
- [ ] Page has a single `<h1>` (the main headline)
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Skip-to-content link is available for keyboard users
- [ ] Links are distinguishable from surrounding text
- [ ] Touch targets are at least 44×44px on mobile

## SEO Essentials

When building landing pages as Next.js routes, include metadata:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Page Title — Product Name",
	description: "Concise page description under 160 characters for search results.",
	openGraph: {
		title: "Page Title — Product Name",
		description: "Description for social sharing.",
		images: [{ url: "/og-image.png", width: 1200, height: 630 }],
	},
};
```

## Performance Considerations

- Use `next/image` for automatic optimization, lazy loading, and responsive sizing
- Keep above-the-fold content lightweight — avoid heavy animations in the hero
- Use `loading="lazy"` for images below the fold (default with `next/image`)
- Minimize client-side JavaScript — prefer server components where possible
- Use `priority` prop on hero images for LCP optimization
- Avoid layout shifts by specifying `width` and `height` on all images
