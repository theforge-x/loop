export type OutgoingEmail = { from: string; to: string; subject: string; html: string; text: string };
export async function sendEmail(key: string, email: OutgoingEmail, idempotencyKey: string) {
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify({ ...email, to: [email.to] }), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Email provider rejected the request (${response.status}).`);
  const result: unknown = await response.json();
  if (!result || typeof result !== "object" || !("id" in result) || typeof result.id !== "string") throw new Error("Email provider returned an invalid response.");
  return result.id;
}
export function escapeHtml(value: string) { return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!); }
