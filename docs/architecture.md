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

## Administration and advanced operations

Content drafts live in their own tenant-protected table rather than a JSON column on a publicly readable record. Server forms validate an allowlisted module schema; publication locks and copies the draft transactionally. Bulk publication is all-or-nothing. Identity/theme/site settings have a separate private draft and an atomic publish operation. The public homepage component is reused for authenticated preview; preview inventory comes from actual reservations. Membership changes retain an owner and cannot move a membership identity.

Storage is private and has authenticated tenant/role write policies plus explicit published-asset reads. Upload requests are bounded before multipart parsing, check file signatures and MIME/size, and use generated tenant-prefixed paths. Gallery/photo visibility is independent of object publication. Deletion refuses referenced images; signed URLs already issued may remain usable until expiry.

Notifications claim an atomic lease rather than relying on a processing flag. Expired claims can be recovered; updates include the lease token so a stale worker cannot overwrite a newer claim. Authenticated operators can retry eligible jobs, and the worker authenticates a separate random secret. Delivery events use raw-body Svix verification, a timestamp window, unique event IDs and per-wedding suppression. The database stores no raw invitation token in queued payloads; retries issue replacement invitation links in memory. Provider acceptance and inbox delivery remain distinct, and external acceptance during a timeout cannot be made transactional with PostgreSQL.

The gallery explicitly restores focus to the actual opening thumbnail because multiple Radix triggers otherwise share the final trigger reference. Error-page recovery uses native navigation so it remains functional when the client router is failing. Playwright binds its test server to the same loopback origin used by its browser; production anonymous write protection uses the configured canonical origin and actual request origin.
