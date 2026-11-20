# Loop

Loop is a single-wedding invitation with a private dashboard. Guests reply with invitation codes and can reserve gifts without accounts. MySQL stores invitations, RSVP revisions and gift reservations.

## Local setup

1. Install Node.js 24, pnpm 11.24.0, and MySQL or MariaDB. Create an empty database and an application user with access to it.
2. Copy `.env.example` to `.env`. Set the database URL and generate `AUTH_SECRET` with `openssl rand -hex 32`. Set your own `ADMIN_EMAIL` and `ADMIN_PASSWORD` (14–128 characters).
3. Install, migrate, seed, and start the app.

```sh
pnpm install --frozen-lockfile
pnpm db:deploy
pnpm db:seed
pnpm dev
```

Open [the invitation](http://localhost:3000) or [admin sign-in](http://localhost:3000/admin/login). The seed creates an editable sample wedding. With `SEED_DEMO=true` and an admin configured, it also creates sample gifts and a household when those tables are empty. The terminal prints the sample invitation code once. Keep demo records in a development database.

The seed command can also provision another admin or rotate an existing admin’s password. It invalidates that account’s sessions and preserves existing wedding content. Remove `ADMIN_PASSWORD` from the running environment after provisioning.

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | MySQL connection string. Percent-encode special characters in credentials. |
| `AUTH_SECRET` | Random string of at least 32 characters used to key rate-limit identifiers. |
| `APP_URL` | Canonical site origin. Use HTTPS in production. This controls guest origin checks and secure admin cookies. |
| `UPLOAD_DIR` | Writable image directory. Defaults to `.loop-data/uploads`. Use an absolute, persistent path in production. |
| `TRUSTED_CLIENT_IP_HEADER` | Optional header that a controlled reverse proxy overwrites with the client IP. If absent, limits use shared buckets. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Seed-only administrator credentials. |
| `SEED_DEMO` | Optional dev seed data. Defaults to false. |

The website editor saves individual sections to a draft. Use **Preview draft** to review and **Publish website** to make the whole draft live. Date rules use the wedding timezone, and any invitation-specific deadline overrides the site-wide date. Replies remain open through the end of the deadline date unless the administrator disables the invitation sooner.

Invitation codes are displayed once and can be replaced on the Guests screen. Share them privately. Guest exports omit codes. Gift reservations can be confirmed, cancelled, or marked received. Deleting a gift removes it from the public wishlist and retains its history in the dashboard.

## Test and build

```sh
pnpm typecheck
pnpm build
pnpm start
```

Use an empty, dedicated `loop_test` database for integration tests. Set `DATABASE_URL` to this database, set `AUTH_SECRET`, apply migrations, and run `pnpm test:integration`. Recreate the test database before repeating the suite.

See [Hosting and maintenance](docs/hosting-and-maintenance.md) and [Acceptance results](docs/acceptance.md).

## Sample assets

The seed wedding and names are illustrative. Replace the sample photographs with your own before publishing the real invitation. Wedding demo photography comes from [Unsplash](https://unsplash.com/license). The original image files are [hero](https://images.unsplash.com/photo-1519741497674-611481863552), [story](https://images.unsplash.com/photo-1511285560929-80b456fea0bc), [table](https://images.unsplash.com/photo-1511795409834-ef04bbd61622), and [gallery](https://images.unsplash.com/photo-1519225421980-715cb0215aed). The bundled DM Sans and Instrument Serif licenses are in `public/fonts`.
