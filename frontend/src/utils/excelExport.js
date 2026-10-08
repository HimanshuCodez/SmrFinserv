export const getColumnValue = (column, row, index) => (
  column.value ? column.value(row, index) : row[column.key]
);

export const exportToExcel = async ({ rows, columns, sheetName, fileName }) => {
  if (rows.length === 0) throw new Error("No records to export.");

  // Load the workbook library only when an export is requested.
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.columns = columns.map(column => ({
    header: column.header,
    width: Math.min(40, Math.max(16, column.header.length + 4)),
  }));

  rows.forEach((row, index) => {
    worksheet.addRow(columns.map(column => {
      const value = getColumnValue(column, row, index);
      if (value === undefined || value === null || value === "") return "";
      if (column.numeric && Number.isFinite(Number(value))) return Number(value);
      // Keep identifiers, leading zeroes and formula-like input as literal text.
      return typeof value === "number" ? value : String(value);
    }));
  });

  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern", pattern: "solid", fgColor: { argb: "FF1E90FF" },
  };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: rows.length + 1, column: columns.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }));
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  link.href = url;
  link.download = `${fileName.replace(/[<>:"/\\|?*]/g, "_")}_${timestamp}.xlsx`;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Allow the browser to start reading the download before releasing its URL.
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
};
