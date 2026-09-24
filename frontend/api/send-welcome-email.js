/* global process */
// Vercel serverless function: sends the welcome mail for a newly created advisor / employee via Resend.
// Env vars (Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY  - required
//   RESEND_FROM     - optional, e.g. "SMR Finserv <no-reply@smrfinserv.com>" once the domain is verified.
//                     Until then Resend's test sender is used, which can only deliver to your own Resend account email.

const DEFAULT_FROM = "SMR Finserv <onboarding@resend.dev>";

const escapeHtml = (s = "") =>
  String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "RESEND_API_KEY is not configured" });

  const { to, name, role, id, loginEmail } = req.body || {};
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return res.status(400).json({ error: "A valid recipient email is required" });
  if (!id || !/^(ADV|EMP)\d{3,}$/.test(id)) return res.status(400).json({ error: "Invalid ID" });

  const roleLabel = role === "Employee" ? "Employee" : "Advisor";
  const safeName = escapeHtml(name || "there");
  const safeId = escapeHtml(id);

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1e293b">
      <h2 style="color:#1e90ff;margin:0 0 16px">Welcome to SMR Finserv!</h2>
      <p>Hi ${safeName},</p>
      <p>We're delighted to have you on board as an ${roleLabel.toLowerCase()} with SMR Finserv.</p>
      <p style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px 18px;font-size:16px">
        Your ${roleLabel} ID is <strong>${safeId}</strong>
      </p>
      ${loginEmail ? `<p>You can log in to the portal using <strong>${escapeHtml(loginEmail)}</strong>.</p>` : ""}
      <p>Please keep this ID for your records.</p>
      <p style="margin-top:28px">Regards,<br/>Team SMR Finserv</p>
    </div>`;

  const text = `Welcome to SMR Finserv!\n\nHi ${name || "there"},\n\nYour ${roleLabel} ID is ${id}.${loginEmail ? `\nLogin email: ${loginEmail}` : ""}\n\nRegards,\nTeam SMR Finserv`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || DEFAULT_FROM,
        to: [to],
        subject: `Welcome to SMR Finserv - Your ${roleLabel} ID is ${id}`,
        html,
        text,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: data.message || "Failed to send email" });
    return res.status(200).json({ id: data.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
