---
name: landing-page
description: >
  Create beautiful, responsive portfolio and personal landing pages using HTML + Tailwind CSS.
  Use when the user asks to "create a landing page", "build a portfolio site", "make a personal website",
  "design a homepage", "build a one-pager", "create a personal page", "make a portfolio",
  "build me a website", "create an about me page", "make a freelancer site", or wants a single-page
  static website for personal branding, portfolio showcase, or freelance services.
---

# Landing Page Creator

Create polished, responsive single-page portfolio and personal landing pages using HTML + Tailwind CSS (via CDN). Output is a single self-contained `.html` file ready to open in any browser or deploy to any static host.

## Workflow

1. **Gather requirements** — Ask the user for:
   - Name and role/title
   - Brand color preference (default: sky blue `#0ea5e9`)
   - Number of projects to showcase (default: 2)
   - Number of skills/services (default: 3)
   - Whether to include testimonials section (default: yes)
   - Social links (GitHub, LinkedIn, Twitter/X)

2. **Copy the template** — Read `assets/template.html` as the starting point. Never build from scratch.

3. **Replace all placeholders** — Substitute every `{{PLACEHOLDER}}` with user-provided or contextually appropriate content. See `references/design-guide.md` → "Template Placeholders" for the full list.

4. **Customize the brand color** — Update the `tailwind.config` `brand` color palette in the `<script>` tag. Use a tool like the Tailwind palette or generate shades from the user's chosen hex color.

5. **Add or remove sections** — Adjust the number of project cards, skill cards, and testimonials to match user requirements. Remove the testimonials section entirely if the user opts out.

6. **Add real images** — Replace emoji placeholders with actual `<img>` tags when the user provides image URLs or file paths. Ensure all images have descriptive `alt` text.

7. **Save the file** — Write the final HTML to the user's chosen location (default: `landing-page.html` in the working directory).

## Design Standards

Follow the design system documented in `references/design-guide.md`. Key rules:

- **Single-file output** — Everything in one `.html` file (Tailwind via CDN, Google Fonts via `@import`)
- **Mobile-first responsive** — All layouts stack on mobile, expand on `md:` and `lg:` breakpoints
- **Alternating backgrounds** — Sections alternate `bg-white` / `bg-gray-50` for visual rhythm
- **Consistent spacing** — `py-24` between sections, `max-w-6xl mx-auto px-6` containers
- **Rounded design language** — Cards use `rounded-2xl`, buttons use `rounded-full`, inputs use `rounded-xl`
- **Frosted glass nav** — Fixed top nav with `bg-white/80 backdrop-blur-md`
- **Smooth scroll** — `scroll-smooth` on the `<html>` element
- **Inter font** — Loaded from Google Fonts

## Quality Checklist

Before delivering the landing page, verify:

- [ ] All `{{PLACEHOLDER}}` values replaced (search for `{{` to confirm zero remain)
- [ ] Brand color palette updated if user specified a custom color
- [ ] Page title and meta description are meaningful
- [ ] All images have `alt` text
- [ ] Social links point to valid URLs (or are removed if not provided)
- [ ] Mobile menu toggle works
- [ ] Contact form has proper `required` attributes
- [ ] Copyright year is current
- [ ] Page renders correctly at 320px, 768px, and 1280px widths

## Customization Patterns

### Adding more project cards
Duplicate a project card `<div>` inside the projects grid. Alternate gradient colors (`from-brand-100`, `from-purple-100`, `from-green-100`) for visual variety.

### Adding more skill cards
Duplicate a skill card `<div>` inside the skills grid. The `lg:grid-cols-3` grid handles 3, 6, or 9 cards cleanly. For 4 or 5 cards, switch to `lg:grid-cols-2`.

### Dark mode variant
Add `dark` class support by wrapping colors in `dark:` prefixed utilities and adding a toggle button in the nav. Update `tailwind.config` to include `darkMode: 'class'`.

### Custom sections
New sections should follow the established pattern:
```html
<section id="section-name" class="py-24 bg-white">
  <div class="max-w-6xl mx-auto px-6">
    <div class="max-w-2xl mx-auto text-center mb-16">
      <p class="text-sm font-medium text-brand-600 tracking-wide uppercase mb-3">Label</p>
      <h2 class="text-3xl md:text-4xl font-bold text-gray-900">Heading</h2>
    </div>
    <!-- Section content -->
  </div>
</section>
```
