const SPREADSHEET_ID = "1Ftu7ivwR8aWZ8g3tgvLmikIB7D93eHaaVoINMZLlCuE";

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

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    const category = normalizeCategory(payload.category);

    if (!category) {
      throw new Error("Missing category");
    }

    if (payload.action === "syncAll") {
      syncAll(category, payload.records || []);
    } else if (payload.action === "syncRow") {
      syncRow(category, payload.record || {});
    } else {
      throw new Error("Unknown action: " + payload.action);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}

function syncAll(category, records) {
  const sheet = getSheet(category);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);

  if (!records.length) {
    return;
  }

  const rows = records.map(function(record) {
    return toRow(record);
  });
  sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
}

function syncRow(category, record) {
  const sheet = getSheet(category);
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

function getSheet(category) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(category) || spreadsheet.insertSheet(category);
  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const hasHeaders = firstRow.some(function(value) {
    return value !== "";
  });

  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }

  return sheet;
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

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
