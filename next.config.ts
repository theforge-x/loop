import type { NextConfig } from "next";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseUrl ? [{ protocol: supabaseUrl.protocol === "http:" ? "http" : "https", hostname: supabaseUrl.hostname, port: supabaseUrl.port, pathname: "/storage/v1/object/sign/wedding-media/**" }] : [],
    dangerouslyAllowLocalIP: Boolean(supabaseUrl && ["127.0.0.1", "localhost"].includes(supabaseUrl.hostname)),
  },
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
      ...(process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
    ] }, { source: "/admin/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] }, { source: "/invitation/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] }, { source: "/gift-reservations/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] }, { source: "/:weddingSlug/contribution", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] }];
  },
};
export default nextConfig;
