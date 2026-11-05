# Architecture decisions

## Phase 1

- One Next.js App Router application with strict TypeScript. Server Components are the default; forms, motion, and error boundaries are client components.
- Public and administration experiences have separate layouts. Root `/` describes Loop without inventing couple data. Wedding content will resolve by slug; administration will resolve by wedding ID after membership checks exist.
- Supabase is the future source of truth for all wedding records. Phase 1 does not invent a temporary business database, seed wedding, or fake API.
- Supabase SSR uses separate browser and server clients. The proxy refreshes cookies on authentication/private routes; server layouts and pages independently verify identity with `getUser`. Personalized responses are not publicly cached. Membership and role authorization must be added before tenant records are exposed.
- Current authenticated administration exposes only a generic empty shell. No wedding-ID route accepts access until Phase 2 authorization is tested.
- Tailwind theme tokens and Shadcn-compatible controls provide warm ivory, forest green, earthy accents, and serif typography. System font stacks keep the foundation build independent of external font services.
- Framer Motion is isolated to an optional decorative entrance. Content is visible before hydration and reduced-motion settings are respected.
- No provider secrets are accessed by browser modules. Local secrets stay in ignored environment files. No service-role client exists until a trusted workflow needs one.
- Supabase CLI is a project dependency. SQL history and generated types will be reviewed and committed in Phase 2; a successful empty-schema connection is only a Phase 1 infrastructure check.

## References

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Supabase cookie-based SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Local Supabase development](https://supabase.com/docs/guides/local-development)

The visual reference site was unavailable during initial inspection. The document's written aesthetic is used without copying assets or wedding content.
