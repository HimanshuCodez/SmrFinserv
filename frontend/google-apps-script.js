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
      throw error;
    }
  }

  return {};
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

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
