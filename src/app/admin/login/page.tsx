import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/auth";
import { AdminForm } from "@/components/admin-form";
import { login } from "../actions";

export const metadata = { title: "Loop — Admin sign in", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await currentAdmin()) redirect("/admin");
  return <main className="admin-login">
    <section className="admin-panel">
      <a className="admin-brand" href="/">Loop</a>
      <h1>Admin sign in</h1>
      <AdminForm action={login}>
        <label>Email<input type="email" name="email" autoComplete="username" maxLength={254} required /></label>
        <label>Password<input type="password" name="password" autoComplete="current-password" maxLength={128} required /></label>
        <button className="button">Sign in</button>
      </AdminForm>
    </section>
  </main>;
}
