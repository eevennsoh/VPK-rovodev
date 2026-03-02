# Landing Page Design Guide

## Layout Principles

### Visual Hierarchy
1. **Hero section** — largest text, most visual weight, above the fold
2. **Section headings** — consistent sizing (3xl–4xl), centered with a colored uppercase label above
3. **Body text** — relaxed line height, gray-600 for readability
4. **CTAs** — high-contrast buttons (dark bg, white text), rounded-full shape

### Spacing System
- Section vertical padding: `py-24`
- Container max width: `max-w-6xl mx-auto px-6`
- Card internal padding: `p-6` or `p-8`
- Grid gaps: `gap-6` for tight grids, `gap-8` for card grids
- Between heading group and content: `mb-16`

### Responsive Breakpoints
- Mobile-first: single column stacked layout
- `sm:` (640px) — 2-column grids for form fields
- `md:` (768px) — 2-column grids for cards, show nav links, hero split layout
- `lg:` (1024px) — 3-column grids for skill/service cards

## Color Strategy

### Brand Color System
Use a single brand color with a full shade palette (50–950):
- **50–100**: Backgrounds, subtle fills
- **200–300**: Decorative elements, icons
- **500–600**: Primary text accents, badges, links
- **700–800**: Hover states
- **900–950**: Deep accents (rarely used)

### Neutral Palette
- `gray-900` — Primary headings
- `gray-700` — Secondary text, labels
- `gray-600` — Body text
- `gray-500` — Footer text, timestamps
- `gray-400` — Icons, dividers
- `gray-100` — Borders, subtle dividers
- `gray-50` — Alternating section backgrounds

### Section Background Alternation
Alternate between `bg-white` and `bg-gray-50` for visual rhythm.

## Typography

### Font Stack
- Primary: Inter (Google Fonts) with system-ui fallback
- Weights: 400 (body), 500 (medium labels), 600 (semi-bold subheadings), 700 (bold headings), 800 (extra-bold hero)

### Size Scale
| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Hero heading | `text-5xl md:text-6xl` | `font-extrabold` | gray-900 |
| Section heading | `text-3xl md:text-4xl` | `font-bold` | gray-900 |
| Card heading | `text-lg` | `font-semibold` | gray-900 |
| Section label | `text-sm` | `font-medium tracking-wide uppercase` | brand-600 |
| Body text | `text-base` or `text-lg` | `font-normal` | gray-600 |
| Small text | `text-sm` | `font-normal` | gray-600 |
| Footer / meta | `text-xs` | `font-normal` | gray-500 |

## Component Patterns

### Cards
- Rounded corners: `rounded-2xl`
- Border: `border border-gray-100`
- Shadow: `shadow-sm` (default), `hover:shadow-lg` (interactive)
- Background: `bg-white`

### Buttons
- Primary: `bg-gray-900 text-white hover:bg-gray-800 rounded-full px-6 py-3`
- Secondary: `border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full`
- Link-style: `text-brand-600 hover:text-brand-700 font-medium` with arrow icon

### Badges / Tags
- `text-xs font-medium bg-brand-50 text-brand-600 px-2.5 py-1 rounded-full`

### Icon Containers
- `w-12 h-12 bg-brand-50 rounded-xl` with emoji or SVG icon centered

### Form Inputs
- `rounded-xl border border-gray-300 px-4 py-3 text-sm`
- Focus: `focus:ring-2 focus:ring-brand-500 focus:border-transparent`

### Navigation
- Fixed top: `fixed top-0 inset-x-0 z-50`
- Frosted glass: `bg-white/80 backdrop-blur-md`
- Bottom border: `border-b border-gray-100`

## Animations & Transitions
- Hover transitions: `transition` (default 150ms)
- Shadow transitions: `transition-shadow duration-300`
- Scroll behavior: `scroll-smooth` on html element

## Accessibility Checklist
- All images must have descriptive `alt` text
- Social links need `aria-label`
- Form inputs need `<label>` elements
- Color contrast ratio ≥ 4.5:1 for body text
- Focus states visible on all interactive elements
- Skip-to-content link (add if needed)

## Template Placeholders

All placeholders use `{{PLACEHOLDER_NAME}}` format. Replace every placeholder before shipping.

| Placeholder | Section | Description |
|-------------|---------|-------------|
| `{{NAME}}` | Global | Person or brand name |
| `{{TAGLINE}}` | Title | Short tagline for page title |
| `{{META_DESCRIPTION}}` | Head | SEO meta description (150-160 chars) |
| `{{ROLE}}` | Hero | Role / title label above heading |
| `{{HEADLINE}}` | Hero | Main headline (2-6 words) |
| `{{HERO_DESCRIPTION}}` | Hero | 1-2 sentence description |
| `{{ABOUT_HEADING}}` | About | Section heading |
| `{{ABOUT_PARAGRAPH}}` | About | Bio paragraph |
| `{{STAT_N_VALUE}}` | About | Stat number (e.g. "8+", "50+") |
| `{{STAT_N_LABEL}}` | About | Stat label (e.g. "Years Experience") |
| `{{PROJECT_N_*}}` | Projects | Project title, tag, description, URL |
| `{{SKILL_N_*}}` | Skills | Skill icon (emoji), title, description |
| `{{TESTIMONIAL_N_*}}` | Testimonials | Quote, name, role, initials |
| `{{CONTACT_DESCRIPTION}}` | Contact | Contact section description |
| `{{SOCIAL_*}}` | Footer | Social media URLs |
| `{{YEAR}}` | Footer | Copyright year |
