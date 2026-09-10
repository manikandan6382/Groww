---
name: web_development
description: Expert web development skill covering React, Next.js, Node.js, HTML, CSS, animations, and modern UI/UX best practices for professional web developers.
---

# Web Development Skill

## Context
The user is a professional web developer. Apply senior-level standards to all web work.

## Tech Stack
- **Frontend**: React (functional components), Next.js, Vite
- **Styling**: Vanilla CSS, CSS Modules, CSS custom properties (variables)
- **Animation**: Framer Motion, CSS transitions/keyframes
- **State**: Zustand, TanStack Query (React Query)
- **Build**: Vite, Next.js, Webpack
- **Linting**: ESLint, Prettier

## Design Standards
Always produce stunning, premium UIs:
- Use CSS custom properties for design tokens (colors, spacing, typography)
- Dark mode first where appropriate
- Use Google Fonts (Inter, Outfit, Roboto, Space Grotesk)
- Glass morphism: backdrop-filter, semi-transparent backgrounds
- Micro-animations: hover effects, transitions (200-300ms ease)
- Responsive: Mobile-first, use CSS Grid and Flexbox
- Avoid plain colors — use gradients and carefully chosen palettes

## Code Patterns
`js
// Preferred: Functional components with hooks
const Component = ({ prop }) => {
  const [state, setState] = useState(null);
  
  useEffect(() => {
    // side effects here
  }, []);
  
  return <div className={styles.container}>{prop}</div>;
};
`

## CSS Pattern
`css
:root {
  --color-primary: hsl(220, 80%, 60%);
  --color-bg: hsl(220, 20%, 8%);
  --color-surface: hsl(220, 20%, 12%);
  --radius: 12px;
  --transition: 200ms ease;
}
`

## Performance Tips
- Use React.memo, useMemo, useCallback where appropriate
- Lazy load routes and heavy components
- Optimize images (WebP, proper sizing)
- Use CSS transforms over position changes for animations

## SEO Checklist
- Proper meta tags (title, description, OG)
- Semantic HTML5 (header, main, section, article, nav, footer)
- Single h1 per page, logical heading hierarchy
- Alt text on all images
