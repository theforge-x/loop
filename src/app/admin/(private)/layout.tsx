import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Loop — Administration", robots: { index: false, follow: false } };

const links = [["", "Overview"], ["/content", "Website editor"], ["/guests", "Guests"], ["/rsvps", "RSVPs"], ["/wishlist", "Wishlist"], ["/settings", "Settings"]];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <div className="admin-app">
    <aside className="admin-nav">
      <a href="/admin" className="admin-brand">Loop</a>
      <nav aria-label="Administration">{links.map(([url, name]) => <a key={name} href={"/admin" + url}>{name}</a>)}</nav>
      <div><a href="/">View invitation</a><form action={logout}><button type="submit" className="text-button">Sign out</button></form></div>
    </aside>
    <main className="admin-main">{children}</main>
  </div>;
}
