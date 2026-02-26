---
name: Landing Page Design
description: This skill should be used when the user asks to "build a landing page", "create a landing page", "design a landing page", "make a marketing page", "build a product page", "create a hero section", "design a homepage", "build a signup page", "create a launch page", "make a coming soon page", "build a feature showcase", "design a pricing page", "create an app landing page", "build a SaaS landing page", or wants to build any type of website landing page or marketing page within VPK.
version: 0.1.0
---

# Landing Page Design

Build high-quality, production-ready landing pages within the VPK (Venn Prototype Kit) ecosystem using Next.js, Tailwind CSS v4, ADS design tokens, and VPK UI components.

## Purpose

Provide a structured workflow for creating landing pages that are visually polished, responsive, accessible, and consistent with VPK conventions. Landing pages differ from app UI — they prioritize visual impact, clear messaging hierarchy, and conversion-oriented layout over dense information display.

## When to Use

Activate for any request involving:

- Building a new landing page or marketing page
- Creating hero sections, feature showcases, or pricing layouts
- Designing signup/launch/coming-soon pages
- Converting a design or wireframe into a landing page
- Improving an existing landing page's layout or visual quality

## Core Workflow

### 1. Clarify Requirements

Before building, establish:

- **Page purpose** — product launch, feature announcement, signup, pricing, waitlist
- **Target audience** — developers, product managers, enterprise buyers, general consumers
- **Key sections needed** — hero, features, social proof, pricing, CTA, footer
- **Tone and style** — minimal/clean, bold/energetic, corporate/professional, playful/creative
- **Content availability** — whether copy, images, and logos are provided or need placeholders

### 2. Plan the Page Structure

Organize sections in a logical flow that guides visitors toward the primary action:

```
Hero (above the fold)
  → Value proposition + primary CTA
Social Proof / Logos (optional)
  → Trust signals
Features / Benefits
  → What the product does
How It Works (optional)
  → Step-by-step explanation
Testimonials / Case Studies (optional)
  → Customer validation
Pricing (optional)
  → Plans and comparison
Final CTA
  → Reinforce the primary action
Footer
  → Navigation, legal, social links
```

Not every section is required. Select sections based on the page's purpose.

### 3. Build with VPK Conventions

Follow VPK project standards throughout:

- **File location** — Create landing pages in `app/` as route pages or in `components/templates/` for reusable surfaces
- **Component imports** — Use `@/components/ui/*` primitives (Button, Card, Badge, etc.)
- **Icons** — `@atlaskit/icon/core/*` then `@atlaskit/icon-lab/core/*`
- **Token usage** — Follow the token priority: semantic classes → accent Tailwind classes → `token()` calls
- **Styling** — Use ADS semantic naming in feature code (`bg-surface-raised`, `text-text-subtle`)
- **Images** — `next/image` with explicit `width` + `height`
- **Class merging** — Always use `cn()` from `@/lib/utils`

### 4. Implement Responsive Design

Design mobile-first, then enhance for larger screens:

| Breakpoint | Target | Typical Adjustments |
|------------|--------|---------------------|
| Default | Mobile (< 640px) | Single column, stacked layout, larger touch targets |
| `sm:` | ≥ 640px | Minor spacing adjustments |
| `md:` | ≥ 768px | Two-column layouts, side-by-side features |
| `lg:` | ≥ 1024px | Full desktop layout, wider content areas |
| `xl:` | ≥ 1280px | Max-width containers, generous whitespace |

### 5. Apply Visual Polish

Elevate the page beyond functional layout:

- **Typography hierarchy** — Use distinct sizes for headline (text-4xl/5xl), subheadline (text-xl/2xl), body (text-base/lg), and caption (text-sm)
- **Spacing rhythm** — Use consistent vertical spacing between sections (py-16 to py-24 for major sections)
- **Color contrast** — Alternate section backgrounds (`bg-surface`, `bg-surface-raised`, `bg-bg-neutral`) to create visual rhythm
- **Shadows and elevation** — Use `token("elevation.shadow.raised")` or `token("elevation.shadow.overlay")` for floating elements
- **Motion** — Add subtle entrance animations for sections using CSS transitions or Motion library (see `.claude/rules/motion-react.md`)
- **Dark mode** — Ensure all sections look correct in both light and dark themes

### 6. Validate

Run on every change:

1. `pnpm run lint`
2. `pnpm tsc --noEmit`

For visual verification:

- Check both light and dark themes
- Test responsive behavior at mobile, tablet, and desktop widths
- Verify all interactive elements (buttons, links, forms) are accessible via keyboard
- Confirm images have proper alt text
- Ensure CTAs are prominent and discoverable

## Section Patterns

### Hero Section

The most critical section — establish value immediately:

```tsx
<section className="relative flex min-h-[60vh] flex-col items-center justify-center px-6 py-24 text-center">
	<Badge variant="default" className="mb-4">New Release</Badge>
	<h1 className="max-w-3xl text-4xl font-bold tracking-tight text-text sm:text-5xl lg:text-6xl">
		Headline that communicates value
	</h1>
	<p className="mt-6 max-w-2xl text-lg text-text-subtle">
		Supporting description that expands on the headline
	</p>
	<div className="mt-10 flex flex-col gap-4 sm:flex-row">
		<Button size="lg">Primary Action</Button>
		<Button size="lg" variant="outline">Secondary Action</Button>
	</div>
</section>
```

### Feature Grid

Showcase capabilities in a scannable format:

```tsx
<section className="px-6 py-20">
	<div className="mx-auto max-w-6xl">
		<h2 className="text-center text-3xl font-bold text-text">Features</h2>
		<p className="mt-4 text-center text-text-subtle">Brief section description</p>
		<div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
			{features.map((feature) => (
				<Card key={feature.title} className="p-6">
					<Icon label={feature.title} UNSAFE_size={24} />
					<h3 className="mt-4 text-lg font-semibold text-text">{feature.title}</h3>
					<p className="mt-2 text-text-subtle">{feature.description}</p>
				</Card>
			))}
		</div>
	</div>
</section>
```

### CTA Section

Drive conversion with a focused call-to-action:

```tsx
<section className="bg-bg-brand-bold px-6 py-20 text-center">
	<h2 className="text-3xl font-bold text-text-inverse">Ready to get started?</h2>
	<p className="mt-4 text-lg text-text-inverse opacity-90">
		Reinforcing message about the value proposition
	</p>
	<Button size="lg" variant="secondary" className="mt-8">
		Get Started Free
	</Button>
</section>
```

## Anti-Patterns

| Avoid | Instead |
|-------|---------|
| Hardcoded colors (`bg-white`, `bg-black`, `text-gray-500`) | Semantic tokens (`bg-surface`, `text-text-subtle`) |
| Missing dark mode support | Test both themes; use token-based colors |
| Walls of text in hero sections | Concise headline + short supporting text |
| Too many CTAs competing for attention | One primary CTA per section, clear visual hierarchy |
| Images without `width`/`height` | Always specify dimensions with `next/image` |
| Skipping mobile layout | Design mobile-first, enhance with breakpoints |
| Using `&&` for conditional rendering | Use ternary (`cond ? <X /> : null`) |

## Additional Resources

### Reference Files

For detailed patterns, section templates, and advanced techniques:

- **`references/patterns.md`** — Comprehensive section patterns, layout variations, typography scales, animation recipes, and accessibility checklist
