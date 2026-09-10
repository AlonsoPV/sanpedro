const express = require("express");
const cors = require("cors");
const https = require("https");
const nodemailer = require("nodemailer");

const PORT = process.env.PORT || 8080;
const MONDAY_TOKEN = process.env.MONDAY_TOKEN || "";
const MONDAY_BOARD_ID = "18413790310";
const MONDAY_GROUP_ID = "group_mm2pwz12";
const NOTIFY_EMAILS = ["alpeva96@gmail.com", "mkt@zaiah.com.mx"];

const CAPITAL_VALUES = {
  "1.5 - 2 MDP": "1500000",
  "1.5 – 2 MDP": "1500000",
  "2 - 4 MDP": "2000000",
  "2 – 4 MDP": "2000000",
  "4 - 6 MDP": "4000000",
  "4 – 6 MDP": "4000000",
  "Mas de 6 MDP": "6000000",
  "Más de 6 MDP": "6000000",
};

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/register", async (req, res) => {
  const body = req.body || {};
  const nombre = cleanText(body.nombre);
  const apellido = cleanText(body.apellido);
  const email = cleanText(body.email);
  const telefono = cleanText(body.telefono);
  const perfil = cleanText(body.perfil);
  const capital = cleanText(body.capital);

  if (!nombre || !email) {
    return res.status(400).json({ error: "Nombre y correo son requeridos." });
  }

  const nombreCompleto = [nombre, apellido].filter(Boolean).join(" ");

  res.json({ ok: true });

  if (MONDAY_TOKEN) {
    try {
      const capitalNum = CAPITAL_VALUES[capital] || "";
      const cols = {
        email_mm2p9et1: { email, text: email },
        phone_mm2px8fp: { phone: telefono || "", countryShortName: "MX" },
      };

      if (capitalNum) {
        cols.numeric_mm2q19q1 = capitalNum;
      }

      const createMutation = `mutation CreateLead($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
        create_item(
          board_id: $boardId,
          group_id: $groupId,
          item_name: $itemName,
          column_values: $columnValues
        ) { id }
      }`;

      const createResult = await mondayRequest(createMutation, {
        boardId: MONDAY_BOARD_ID,
        groupId: MONDAY_GROUP_ID,
        itemName: nombreCompleto,
        columnValues: JSON.stringify(cols),
      });
      const itemId = createResult?.data?.create_item?.id;

      if (itemId && (perfil || capital)) {
        const lines = [];
        if (perfil) lines.push(`Me interesa comprar: ${perfil}`);
        if (capital) lines.push(`Capital disponible: ${capital}`);

        const updateMutation = `mutation CreateLeadUpdate($itemId: ID!, $body: String!) {
          create_update(item_id: $itemId, body: $body) { id }
        }`;
        await mondayRequest(updateMutation, {
          itemId,
          body: lines.join("\n"),
        });
      }
    } catch (err) {
      console.error("Monday.com error:", err.message);
    }
  }

  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_PASS = process.env.GMAIL_PASS;

  if (GMAIL_USER && GMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL_USER, pass: GMAIL_PASS },
      });

      const html = `
        <h2>Nueva reserva - Zaiah Health</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
          <tr><td style="padding:6px 12px;font-weight:bold">Nombre</td><td style="padding:6px 12px">${escapeHtml(nombreCompleto)}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold">Email</td><td style="padding:6px 12px">${escapeHtml(email)}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold">Telefono</td><td style="padding:6px 12px">${escapeHtml(telefono || "-")}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold">Perfil</td><td style="padding:6px 12px">${escapeHtml(perfil || "-")}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold">Capital</td><td style="padding:6px 12px">${escapeHtml(capital || "-")}</td></tr>
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
});

function mondayRequest(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables });
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
        try {
          const parsed = JSON.parse(data);
          if (parsed.errors?.length) {
            reject(new Error(parsed.errors.map((error) => error.message).join("; ")));
            return;
          }
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function cleanText(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API server on port ${PORT}`);
});
