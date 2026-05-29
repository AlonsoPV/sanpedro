const express = require("express");
const cors = require("cors");
const https = require("https");
const nodemailer = require("nodemailer");

const PORT = process.env.PORT || 8080;
const MONDAY_TOKEN = process.env.MONDAY_TOKEN || "";
const MONDAY_BOARD_ID = "18413790310";
const MONDAY_GROUP_ID = "group_mm2pwz12";
const NOTIFY_EMAILS = ["alpeva96@gmail.com", "mkt@zaiah.com.mx"];

const app = express();
app.use(cors());
app.use(express.json());

/* ─── Healthz ─────────────────────────────────────────────── */
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

/* ─── POST /api/register ──────────────────────────────────── */
app.post("/api/register", async (req, res) => {
  const { nombre, apellido, email, telefono, perfil, capital } = req.body || {};

  if (!nombre || !email) {
    return res.status(400).json({ error: "Nombre y correo son requeridos." });
  }

  const nombreCompleto = [nombre, apellido].filter(Boolean).join(" ");

  // ── Monday.com ─────────────────────────────────────────────
  if (MONDAY_TOKEN) {
    try {
      const capitalMap = {
        "$1.5M - $3M MXN": "1500000",
        "$3M - $5M MXN": "3000000",
        "Más de $5M MXN": "5000000",
      };
      const capitalNum = capitalMap[capital] || "";

      const cols = {
        email_mm2p9et1: { email, text: email },
        phone_mm2px8fp: { phone: telefono || "", countryShortName: "MX" },
        text_mm3khb4b: perfil || "",
      };
      if (capitalNum) cols.numeric_mm2q19q1 = capitalNum;

      const columnValues = JSON.stringify(cols);

      const mutation = `mutation {
        create_item(
          board_id: ${MONDAY_BOARD_ID},
          group_id: "${MONDAY_GROUP_ID}",
          item_name: "${nombreCompleto.replace(/"/g, '\\"')}",
          column_values: ${JSON.stringify(columnValues)}
        ) { id }
      }`;

      await mondayRequest(mutation);
    } catch (err) {
      console.error("Monday.com error:", err.message);
    }
  }

  // ── Email notification ──────────────────────────────────────
  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_PASS = process.env.GMAIL_PASS;

  if (GMAIL_USER && GMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL_USER, pass: GMAIL_PASS },
      });

      const html = `
        <h2>Nueva reserva — Zaiah Health</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
          <tr><td style="padding:6px 12px;font-weight:bold">Nombre</td><td style="padding:6px 12px">${nombreCompleto}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold">Email</td><td style="padding:6px 12px">${email}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold">Teléfono</td><td style="padding:6px 12px">${telefono || "—"}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold">Perfil</td><td style="padding:6px 12px">${perfil || "—"}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold">Capital</td><td style="padding:6px 12px">${capital || "—"}</td></tr>
        </table>
      `;

      await transporter.sendMail({
        from: `"Zaiah Health" <${GMAIL_USER}>`,
        to: NOTIFY_EMAILS.join(", "),
        subject: `Nueva reserva: ${nombreCompleto}`,
        html,
      });
    } catch (err) {
      console.error("Email error:", err.message);
    }
  }

  return res.json({ ok: true });
});

/* ─── Monday.com helper ───────────────────────────────────── */
function mondayRequest(query) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query });
    const options = {
      hostname: "api.monday.com",
      path: "/v2",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: MONDAY_TOKEN,
        "API-Version": "2024-01",
      },
    };
    const req = https.request(options, (r) => {
      let data = "";
      r.on("data", (c) => (data += c));
      r.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API server on port ${PORT}`);
});
