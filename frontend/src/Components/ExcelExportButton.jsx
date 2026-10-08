import { useState } from "react";
import toast from "react-hot-toast";
import { exportToExcel } from "../utils/excelExport";

export default function ExcelExportButton({ rows, columns, sheetName, fileName }) {
  const [exporting, setExporting] = useState(false);
  const disabled = exporting || rows.length === 0;

  const handleExport = async () => {
    if (disabled) return;
    setExporting(true);
    try {
      await exportToExcel({ rows, columns, sheetName, fileName });
      toast.success(`Exported ${rows.length} ${rows.length === 1 ? "record" : "records"} to Excel.`);
    } catch (error) {
      console.error("Excel export failed:", error);
      toast.error("Could not export to Excel. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={disabled}
      aria-busy={exporting}
      title={rows.length === 0 ? "No records to export" : `Export ${rows.length} displayed records`}
      style={{
        padding: "9px 16px", borderRadius: 8, border: "none", fontSize: 12,
        fontWeight: 700, background: disabled ? "#e2e8f0" : "#16a34a",
        color: disabled ? "#64748b" : "#fff", cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {exporting ? "Exporting..." : "Export to Excel"}
    </button>
  );
}
