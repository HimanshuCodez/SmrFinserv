const SPREADSHEET_ID = "1Ftu7ivwR8aWZ8g3tgvLmikIB7D93eHaaVoINMZLlCuE";
const ALL_DATA_SHEET_NAME = "All Data";

const HEADERS = [
  "id",
  "slNo",
  "entryMonth",
  "entryYear",
  "category",
  "vehicleNumber",
  "policyNo",
  "folioNo",
  "mobileNo",
  "imdCode",
  "name",
  "company",
  "vehicleType",
  "make",
  "model",
  "policyType",
  "subType",
  "productName",
  "plan",
  "sumAssured",
  "familyMembers",
  "bonus",
  "tenure",
  "riskDate",
  "endDate",
  "paymentDate",
  "nextPaymentDate",
  "paymentType",
  "od",
  "tp",
  "netPrem",
  "prem",
  "payout",
  "companyPercentage",
  "amount",
  "remarks",
  "addedBy",
  "addedByName",
  "syncedAt"
];

function doGet() {
  try {
    setupSheets();
    return jsonResponse({
      ok: true,
      message: "SMR Google Sheets sync is ready.",
      spreadsheetId: SPREADSHEET_ID
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error.message
    });
  }
}

function doPost(e) {
  try {
    const payload = parsePayload(e);

    if (payload.action === "sendWelcomeEmail") {
      return jsonResponse(sendWelcomeEmail(payload));
    }

    const category = normalizeCategory(payload.category);

    if (!category) {
      throw new Error("Missing category");
    }

    if (payload.action === "syncAll") {
      syncAll(category, payload.records || [], !!payload.replace);
    } else if (payload.action === "syncRow") {
      syncRow(category, payload.record || {});
    } else {
      throw new Error("Unknown action: " + payload.action);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    writeSyncError(error);
    return jsonResponse({ ok: false, error: error.message });
  }
}

function parsePayload(e) {
  const rawContents = (e && e.postData && e.postData.contents) || "";
  const rawPayload = e && e.parameter && e.parameter.payload ? e.parameter.payload : "";
  const source = rawPayload || rawContents || "{}";

  if (typeof source === "string") {
    try {
      return JSON.parse(source);
    } catch (error) {
      const params = e && e.parameter ? e.parameter : {};
      if (params.action) {
        return {
          action: params.action,
          category: params.category,
          record: params.record ? JSON.parse(params.record) : {},
          records: params.records ? JSON.parse(params.records) : [],
          replace: params.replace === "true" || params.replace === true
        };
      }

      const decoded = decodeFormEncoded(rawContents);
      if (decoded.payload) {
        return JSON.parse(decoded.payload);
      }
      if (decoded.action) {
        return {
          action: decoded.action,
          category: decoded.category,
          record: decoded.record ? JSON.parse(decoded.record) : {},
          records: decoded.records ? JSON.parse(decoded.records) : [],
          replace: decoded.replace === "true"
        };
      }

      throw error;
    }
  }

  return {};
}

function decodeFormEncoded(rawContents) {
  const result = {};
  (rawContents || "").split("&").forEach(function(pair) {
    if (!pair) return;
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const key = decodeURIComponent(pair.slice(0, idx).replace(/\+/g, " "));
    const value = decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, " "));
    result[key] = value;
  });
  return result;
}

function setupSheets() {
  getSheet();
}

function testSync() {
  syncRow("Motor", {
    id: "apps-script-test",
    slNo: "TEST",
    entryMonth: "06",
    entryYear: "2026",
    category: "Motor",
    policyNo: "TEST-POLICY",
    name: "Apps Script Test",
    mobileNo: "0000000000",
    remarks: "If this row appears, Apps Script has permission to write."
  });
}

function syncAll(category, records, replace) {
  const sheet = getSheet();
  if (replace) {
    sheet.clearContents();
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  } else if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }

  if (!records.length) {
    return;
  }

  const rows = records.map(function(record) {
    return toRow(record);
  });
  const startRow = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(startRow, 1, rows.length, HEADERS.length).setValues(rows);
}

function syncRow(category, record) {
  const sheet = getSheet();
  const id = record.id || "";
  const row = toRow(record);

  if (!id) {
    sheet.appendRow(row);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(id)) {
        sheet.getRange(i + 2, 1, 1, HEADERS.length).setValues([row]);
        return;
      }
    }
  }

  sheet.appendRow(row);
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(ALL_DATA_SHEET_NAME) || spreadsheet.insertSheet(ALL_DATA_SHEET_NAME);
  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const hasHeaders = firstRow.some(function(value) {
    return value !== "";
  });

  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }

  return sheet;
}

function writeSyncError(error) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName("Sync Errors") || spreadsheet.insertSheet("Sync Errors");
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["time", "message", "stack"]);
    }
    sheet.appendRow([new Date(), error.message || String(error), error.stack || ""]);
  } catch (ignored) {
    console.error(error);
  }
}

function toRow(record) {
  const rowRecord = Object.assign({}, record, {
    syncedAt: new Date()
  });

  return HEADERS.map(function(header) {
    const value = rowRecord[header];
    if (value === undefined || value === null) {
      return "";
    }
    return value;
  });
}

function normalizeCategory(category) {
  const allowed = {
    Motor: "Motor",
    Health: "Health",
    SME: "SME",
    Life: "Life",
    MutualFund: "MutualFund"
  };
  return allowed[category] || "";
}

// Welcome mail for new advisors / employees, sent through Resend.
// Set these in Apps Script → Project Settings → Script Properties:
//   RESEND_API_KEY  - required
//   RESEND_FROM     - optional, e.g. "SMR Finserv <no-reply@smrfinserv.com>" once the domain is verified.
//                     Defaults to no-reply@smrfinserv.com (domain verified on Resend).
function sendWelcomeEmail(payload) {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty("RESEND_API_KEY");
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY is not set in Script Properties" };

  const to = String(payload.to || "").trim();
  const id = String(payload.id || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { ok: false, error: "A valid recipient email is required" };
  const roleLabel = payload.role === "Employee" ? "Employee" : "Advisor";
  // Accept existing IDs as well as the new prefixes; always display the saved ID verbatim.
  const idPattern = roleLabel === "Employee" ? /^(SMRE|EMP)\d{3,}$/ : /^(SMR|ADV)\d{3,}$/;
  if (!idPattern.test(id)) return { ok: false, error: "Invalid " + roleLabel + " ID" };

  const email = buildWelcomeEmail({
    name: String(payload.name || "").trim() || "New Team Member",
    roleLabel: roleLabel,
    id: id,
    loginEmail: String(payload.loginEmail || "").trim()
  });

  const response = UrlFetchApp.fetch("https://api.resend.com/emails", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + apiKey },
    payload: JSON.stringify({
      from: props.getProperty("RESEND_FROM") || "SMR Finserv <no-reply@smrfinserv.com>",
      to: [to],
      subject: "Welcome to SMR Finserv - Your " + roleLabel + " ID is " + id,
      html: email.html,
      text: email.text
    }),
    muteHttpExceptions: true
  });

  let body = {};
  try { body = JSON.parse(response.getContentText()); } catch (ignored) {}
  if (response.getResponseCode() >= 300) {
    return { ok: false, error: body.message || "Resend error " + response.getResponseCode() };
  }
  return { ok: true, id: body.id };
}

// Table layout and inline styles keep the welcome readable across email clients.
// Build both formats from the same partner list so the plain-text version stays complete.
function buildWelcomeEmail(details) {
  const partnerGroups = [
    {
      title: "General Insurance",
      names: ["ICICI Lombard", "Bajaj General Insurance", "Tata AIG", "SBI General", "New India Assurance", "Go Digit"]
    },
    {
      title: "Health Insurance",
      names: ["Niva Bupa", "Aditya Birla Health Insurance", "ICICI Lombard", "SBI General"]
    },
    {
      title: "Life Insurance",
      names: ["LIC of India", "Axis Max Life", "ICICI Prudential Life Insurance", "Bajaj Life Insurance"]
    }
  ];
  const name = escapeHtml(details.name);
  const roleLabel = escapeHtml(details.roleLabel);
  const id = escapeHtml(details.id);
  const loginEmail = escapeHtml(details.loginEmail);
  const partnerHtml = partnerGroups.map(function(group) {
    const rows = [];
    for (let i = 0; i < group.names.length; i += 2) {
      const cells = group.names.slice(i, i + 2).map(function(partner) {
        return '<td class="partner-cell" width="50%" valign="top" style="padding:5px 12px 5px 0;font-size:14px;line-height:22px;color:#475569;">' +
          '<span style="color:#2877b8;">&#8226;</span>&nbsp; ' + escapeHtml(partner) + '</td>';
      }).join("");
      rows.push('<tr>' + cells + '</tr>');
    }
    return '<tr><td style="padding:20px 0;border-bottom:1px solid #e2e8f0;">' +
      '<h3 style="margin:0 0 8px;font-size:16px;line-height:24px;color:#17365c;">' + escapeHtml(group.title) + '</h3>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;">' + rows.join("") + '</table>' +
      '</td></tr>';
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Welcome to SMR Finserv</title>
  <style>
    body { margin:0; padding:0; }
    table { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
    @media only screen and (max-width:620px) {
      .outer-padding { padding:12px 8px !important; }
      .content-padding { padding-left:22px !important; padding-right:22px !important; }
      .welcome-title { font-size:28px !important; line-height:36px !important; }
      .partner-cell { display:block !important; width:100% !important; padding-right:0 !important; }
      .member-id { font-size:28px !important; letter-spacing:2px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#edf2f7;font-family:Arial,Helvetica,sans-serif;color:#334155;-webkit-text-size-adjust:100%;">
  <div style="display:none;font-size:1px;line-height:1px;color:#edf2f7;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">Welcome to the SMR Finserv Family! Your ${roleLabel} ID: ${id}. Let’s Learn • Grow • Achieve • Succeed.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#edf2f7">
    <tr><td class="outer-padding" align="center" style="padding:36px 16px;">
      <!--[if mso]><table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:640px;border:1px solid #dce5ef;">
        <tr><td bgcolor="#f2ce38" height="5" style="height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td class="content-padding" style="padding:26px 40px 24px;">
          <p style="margin:0;color:#2877b8;font-size:25px;line-height:30px;font-weight:800;letter-spacing:2px;">SMR FINSERV</p>
          <p style="margin:5px 0 0;color:#64748b;font-size:10px;line-height:16px;letter-spacing:2px;">IMF PVT LTD</p>
        </td></tr>
        <tr><td class="content-padding" bgcolor="#132f52" style="padding:36px 40px;color:#ffffff;">
          <p style="margin:0 0 14px;font-size:12px;line-height:20px;font-weight:700;letter-spacing:2px;color:#f2ce38;">🎉 WELCOME TO</p>
          <h1 class="welcome-title" style="margin:0;font-size:34px;line-height:43px;font-weight:700;color:#ffffff;">SMR FINSERV<br>IMF PVT LTD 🎉</h1>
          <p style="margin:22px 0 0;font-size:15px;line-height:26px;color:#d8e8fa;">Learn <span style="color:#f2ce38;">•</span> Grow <span style="color:#f2ce38;">•</span> Achieve <span style="color:#f2ce38;">•</span> Succeed</p>
        </td></tr>
        <tr><td class="content-padding" style="padding:32px 40px 0;">
          <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#17365c;font-weight:700;overflow-wrap:anywhere;">Dear ${name},</p>
          <p style="margin:0 0 12px;font-size:16px;line-height:27px;">A very warm welcome to the <strong style="color:#17365c;">SMR Finserv Family!</strong> 🤝💙</p>
          <p style="margin:0;font-size:15px;line-height:26px;">We are delighted to have you join us. Together, let’s <strong>Learn • Grow • Achieve • Succeed</strong> and build a stronger future.</p>
        </td></tr>
        <tr><td class="content-padding" style="padding:24px 40px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f0f6fc" style="border:1px solid #cddff0;border-left:4px solid #2877b8;table-layout:fixed;">
            <tr><td style="padding:22px 24px;">
              <p style="margin:0 0 8px;font-size:11px;line-height:18px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#42658a;">Your ${roleLabel} ID</p>
              <p class="member-id" style="margin:0;font-size:32px;line-height:40px;letter-spacing:3px;font-weight:700;color:#17365c;overflow-wrap:anywhere;word-break:break-word;">${id}</p>
              <p style="margin:10px 0 0;font-size:13px;line-height:21px;color:#526880;">Please keep this ID for your records.</p>
              ${loginEmail ? `<p style="margin:16px 0 0;padding-top:14px;border-top:1px solid #cddff0;font-size:13px;line-height:22px;color:#526880;">You can log in to the portal using<br><strong style="color:#17365c;overflow-wrap:anywhere;word-break:break-all;">${loginEmail}</strong></p>` : ""}
            </td></tr>
          </table>
        </td></tr>
        <tr><td class="content-padding" style="padding:0 40px;">
          <h2 style="margin:0 0 10px;font-size:21px;line-height:30px;color:#17365c;">Insurance &amp; Financial Solutions<br>Under One Roof</h2>
          <p style="margin:0 0 24px;font-size:14px;line-height:24px;color:#64748b;">SMR Finserv IMF Pvt Ltd brings insurance and financial solutions together for you.</p>
          <p style="margin:0;padding-bottom:12px;border-bottom:2px solid #2877b8;font-size:11px;line-height:20px;font-weight:700;letter-spacing:1.5px;color:#42658a;text-transform:uppercase;">Our Key Channel Partners</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${partnerHtml}</table>
          <p style="margin:18px 0 26px;font-size:14px;line-height:24px;color:#42658a;">✨ And many more insurance &amp; financial solutions</p>
        </td></tr>
        <tr><td class="content-padding" style="padding:0 40px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f8fafc" style="border:1px solid #e2e8f0;table-layout:fixed;">
            <tr><td style="padding:20px 22px;">
              <p style="margin:0 0 5px;font-size:14px;line-height:22px;font-weight:700;color:#17365c;">IRDAI Approved IMF</p>
              <p style="margin:0;font-size:13px;line-height:22px;color:#526880;overflow-wrap:anywhere;">License No.: <strong>IMF08790220250768</strong></p>
              <p style="margin:14px 0 0;padding-top:14px;border-top:1px solid #e2e8f0;font-size:14px;line-height:22px;color:#17365c;">🇮🇳 <strong>Start Up India Registered</strong></p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td class="content-padding" style="padding:0 40px 32px;">
          <p style="margin:0 0 22px;font-size:16px;line-height:26px;color:#17365c;">Once again, <strong>Welcome to SMR Finserv!</strong></p>
          <p style="margin:0;font-size:18px;line-height:28px;font-weight:700;color:#17365c;">Rajesh Pandey</p>
          <p style="margin:3px 0 0;font-size:13px;line-height:22px;color:#64748b;">Founder<br>SMR FINSERV IMF PVT LTD</p>
        </td></tr>
        <tr><td class="content-padding" bgcolor="#132f52" style="padding:25px 40px;color:#ffffff;">
          <p style="margin:0 0 12px;font-size:11px;line-height:18px;font-weight:700;letter-spacing:1.5px;color:#f2ce38;">LET’S STAY CONNECTED</p>
          <p style="margin:0 0 8px;font-size:14px;line-height:25px;">📞 <a href="tel:+919971418462" style="color:#ffffff;text-decoration:none;white-space:nowrap;">9971418462</a> &nbsp;|&nbsp; <a href="tel:+919711971269" style="color:#ffffff;text-decoration:none;white-space:nowrap;">9711971269</a></p>
          <p style="margin:0 0 8px;font-size:14px;line-height:25px;">🌐 <a href="https://www.smrfinserv.com" style="color:#ffffff;text-decoration:underline;">www.smrfinserv.com</a></p>
          <p style="margin:0;font-size:14px;line-height:25px;">📧 <a href="mailto:Contact@smrfinserv.com" style="color:#ffffff;text-decoration:underline;overflow-wrap:anywhere;">Contact@smrfinserv.com</a></p>
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    "🎉 WELCOME TO SMR FINSERV IMF PVT LTD 🎉",
    "Dear " + details.name + ",",
    "A very warm welcome to the SMR Finserv Family! 🤝💙\nWe are delighted to have you join us. Together, let’s Learn • Grow • Achieve • Succeed and build a stronger future.",
    "Your " + details.roleLabel + " ID: " + details.id + "\nPlease keep this ID for your records." +
      (details.loginEmail ? "\nYou can log in to the portal using: " + details.loginEmail : ""),
    "SMR Finserv IMF Pvt Ltd deals in Insurance & Financial Solutions Under One Roof",
    "Our Key Channel Partners:\n\n" + partnerGroups.map(function(group) {
      return group.title + "\n" + group.names.map(function(partner) { return "• " + partner; }).join("\n");
    }).join("\n\n"),
    "✨ And many more insurance & financial solutions",
    "We are IRDAI Approved IMF\nLicense No.: IMF08790220250768\n🇮🇳 Start Up India Registered",
    "Once again, Welcome to SMR Finserv!",
    "Rajesh Pandey\nFounder SMR FINSERV IMF PVT LTD",
    "📞 9971418462 | 9711971269\n🌐 www.smrfinserv.com\n📧 Contact@smrfinserv.com"
  ].join("\n\n");

  return { html: html, text: text };
}

// Run this once from the Apps Script editor to grant the "connect to an external service" permission
// needed by sendWelcomeEmail. It only checks the API key; no mail is sent.
function authorizeResend() {
  const apiKey = PropertiesService.getScriptProperties().getProperty("RESEND_API_KEY");
  const response = UrlFetchApp.fetch("https://api.resend.com/api-keys", {
    headers: { Authorization: "Bearer " + apiKey },
    muteHttpExceptions: true
  });
  console.log("Resend responded with " + response.getResponseCode() + " (200 = key OK)");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function(c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
