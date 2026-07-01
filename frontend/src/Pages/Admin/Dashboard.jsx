import { useState, useEffect } from "react";
import { db, storage } from "../../firebase";
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs, updateDoc, doc, deleteDoc, where, limit, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import toast, { Toaster } from "react-hot-toast";
import { syncToGoogleSheets, syncAllToGoogleSheets } from "../../utils/googleSheets";

const SMR_LOGO = "https://i.postimg.cc/Fsbgy6sQ/smr.png";

const Logo = () => (
  <div style={{ display: "flex", alignItems: "center" }}>
    <img
      src={SMR_LOGO}
      alt="SMR Finserv"
      style={{
        height: 48,
        width: "auto",
        objectFit: "contain",
        filter: "drop-shadow(0 2px 8px rgba(30,144,255,0.15))"
      }}
    />
  </div>
);

const Badge = ({ status }) => {
  const colors = {
    Active: { bg: "#dcfce7", color: "#15803d", border: "#bbf7d0" },
    Inactive: { bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" },
    Pending: { bg: "#fef3c7", color: "#b45309", border: "#fde68a" },
    Completed: { bg: "#dcfce7", color: "#15803d", border: "#bbf7d0" },
    Failed: { bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" },
    Enterprise: { bg: "#e0f2fe", color: "#0369a1", border: "#bae6fd" },
    Premium: { bg: "#f3e8ff", color: "#7e22ce", border: "#e9d5ff" },
    Basic: { bg: "#f3f4f6", color: "#4b5563", border: "#e5e7eb" },
    Admin: { bg: "#fdf4ff", color: "#a21caf", border: "#fae8ff" },
  };
  const c = colors[status] || colors.Basic;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      letterSpacing: "0.5px", textTransform: "uppercase"
    }}>{status}</span>
  );
};

const EmptyState = ({ icon, title, subtitle }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "80px 40px", textAlign: "center"
  }}>
    <div style={{
      width: 80, height: 80, borderRadius: "50%",
      background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 36, marginBottom: 24,
      boxShadow: "0 8px 32px rgba(30,144,255,0.05)"
    }}>{icon}</div>
    <div style={{ color: "#1e293b", fontSize: 18, fontWeight: 700, marginBottom: 10, fontFamily: "'Playfair Display', serif" }}>{title}</div>
    <div style={{ color: "#64748b", fontSize: 13, maxWidth: 320, lineHeight: 1.6 }}>{subtitle}</div>
  </div>
);

const AllUsers = ({ isMobile, users }) => (
  <div>
    <div style={{ marginBottom: 28 }}>
      <h1 style={{ color: "#1e293b", fontSize: isMobile ? 22 : 26, fontWeight: 800, fontFamily: "'Playfair Display', serif", marginBottom: 6 }}>All Users</h1>
      <p style={{ color: "#64748b", fontSize: 13 }}>Manage and monitor all registered users</p>
    </div>
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
      <div style={{ padding: isMobile ? "16px" : "20px 24px", borderBottom: "1px solid #e2e8f0" }}>
        <span style={{ color: "#1e293b", fontWeight: 700, fontSize: 15 }}>User Directory</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              {["User", "Email", "Phone", "Role", "Password"].map(h => (
                <th key={h} style={{ padding: "12px 20px", color: "#64748b", fontSize: 11, fontWeight: 700, textAlign: "left", letterSpacing: "1px", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "12px 20px", color: "#1e293b", fontSize: 13 }}>{user.name}</td>
                <td style={{ padding: "12px 20px", color: "#475569", fontSize: 13 }}>{user.email}</td>
                <td style={{ padding: "12px 20px", color: "#475569", fontSize: 13 }}>{user.phone}</td>
                <td style={{ padding: "12px 20px" }}><Badge status={user.role || "User"} /></td>
                <td style={{ padding: "12px 20px", color: "#475569", fontSize: 13 }}>{user.password}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.length === 0 && (
        <EmptyState icon="👥" title="No Users Found" subtitle="Registered users will appear here." />
      )}
    </div>
  </div>
);

const MOTOR_VEHICLE_TYPES = [
  "CAR", "TWO WHEELER: SCOOTY", "TWO WHEELER: BIKE",
  "GCV: 0-2500KG", "GCV: 2500-3500KG", "GCV: 3500-7500KG",
  "GCV: 7500-12000KG", "GCV: 12000-16000KG", "GCV: 16000-55000KG",
  "PCV: SCHOOL BUS", "PCV: STAFF BUS", "PCV: PASSENGER BUS", "PCV: TAXI",
  "MISC D: TRACTOR", "MISC D: CRANE", "E RICKSHAW", "MISC D: OTHER"
];

const HEALTH_FAMILY_MEMBERS = [
  "1 Adult", "2 Adult", "2 Adult 1 child", "2 Adult 2 Child",
  "2 Adult 3 child", "1 Adult 1 Child", "1 Adult 2 child"
];

const COMPANIES_BY_CATEGORY = {
  Motor: [
    "ICICI LOMBARD GENERAL INSURANCE", "TATA AIG", "BAJAJ GENERAL",
    "GO DIGIT", "SBI GENERAL", "NEW INDIA ASSURANCE", "OTHERS"
  ],
  SME: [
    "ICICI LOMBARD GENERAL INSURANCE", "TATA AIG", "BAJAJ GENERAL",
    "GO DIGIT", "SBI GENERAL", "NEW INDIA ASSURANCE", "OTHERS"
  ],
  Life: [
    "LIFE INSURANCE CORPORATION", "AXIS MAX LIFE", "PRUDENTIAL ICICI", "OTHERS"
  ],
  MutualFund: [
    "PRUDENTIAL ICICI", "HDFC MUTUAL", "OSWAL MUTUAL FUND", "OTHERS"
  ],
  Health: [
    "ICICI LOMBARD GENERAL INSURANCE", "TATA AIG", "BAJAJ GENERAL",
    "GO DIGIT", "SBI GENERAL", "NEW INDIA ASSURANCE", "NIVA BUPA", "OTHERS"
  ]
};

const SYNC_CATEGORIES = ["Motor", "Health", "SME", "Life", "MutualFund"];
const SHEET_BACKFILL_VERSION = "v1";
const SHEET_BATCH_SIZE = 75;

const stripSheetOnlyFields = (record) => {
  const cleaned = { ...record };

  delete cleaned.createdAt;
  delete cleaned.updatedAt;
  delete cleaned.customCompany;
  delete cleaned.customVehicleType;

  Object.keys(cleaned).forEach((key) => {
    const lower = key.toLowerCase();
    if (lower.includes("photo") || lower.includes("pdf") || lower.includes("doc")) {
      delete cleaned[key];
    }
  });

  return cleaned;
};

const syncCategoryRecordsToSheet = async (records, category, webAppUrl, replace = false) => {
  for (let i = 0; i < records.length; i += SHEET_BATCH_SIZE) {
    const batch = records.slice(i, i + SHEET_BATCH_SIZE).map(stripSheetOnlyFields);
    await syncAllToGoogleSheets(batch, category, webAppUrl, replace && i === 0);
  }
};

const syncExistingRecordsToSheet = async (webAppUrl) => {
  if (!webAppUrl) {
    throw new Error("Google Apps Script Web App URL is not provided.");
  }

  const settingsRef = doc(db, "settings", "googleSheets");
  const settingsSnap = await getDoc(settingsRef);
  const settingsData = settingsSnap.exists() ? settingsSnap.data() : {};

  if (settingsData.backfillVersion === SHEET_BACKFILL_VERSION && settingsData.backfillUrl === webAppUrl) {
    return { skipped: true };
  }

  const snapshot = await getDocs(collection(db, "dataEntries"));
  const allEntries = snapshot.docs
    .map((entryDoc) => ({ id: entryDoc.id, ...entryDoc.data() }))
    .sort((a, b) => {
      const aTime = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(`${a.entryYear || 0}-${a.entryMonth || 1}-01`).getTime();
      const bTime = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(`${b.entryYear || 0}-${b.entryMonth || 1}-01`).getTime();
      return aTime - bTime;
    });

  for (const category of SYNC_CATEGORIES) {
    const categoryEntries = allEntries.filter((entry) => entry.category === category);
    if (categoryEntries.length > 0) {
      await syncCategoryRecordsToSheet(categoryEntries, category, webAppUrl, true);
    }
  }

  await setDoc(
    settingsRef,
    {
      webAppUrl,
      backfillVersion: SHEET_BACKFILL_VERSION,
      backfillUrl: webAppUrl,
      lastBackfilledAt: serverTimestamp()
    },
    { merge: true }
  );

  return { syncedCount: allEntries.length };
};

const DataRecord = ({ isMobile, currentUser, recordToEdit, onFinished }) => {
  const initialFormState = {
    category: "Motor",
    vehicleNumber: "",
    policyNo: "",
    make: "",
    model: "",
    imdCode: "",
    mobileNo: "",
    name: "",
    company: "",
    customCompany: "",
    vehicleType: "",
    customVehicleType: "",
    policyType: "",
    riskDate: "",
    endDate: "",
    od: "",
    tp: "",
    netPrem: "",
    prem: "",
    payout: "",
    companyPercentage: "",
    remarks: "",
    subType: "", // Business Type / Insurance Type
    sumAssured: "",
    familyMembers: "",
    bonus: "",
    tenure: "",
    productName: "",
    plan: "",
    paymentType: "",
    folioNo: "",
    amount: "",
    paymentDate: "",
    nextPaymentDate: ""
  };

  const [form, setForm] = useState(initialFormState);
  const [aadhaarFrontFile, setAadhaarFrontFile] = useState(null);
  const [aadhaarBackFile, setAadhaarBackFile] = useState(null);
  const [panFrontFile, setPanFrontFile] = useState(null);
  const [panBackFile, setPanBackFile] = useState(null);
  const [policyFile, setPolicyFile] = useState(null);
  const [policyDocFile, setPolicyDocFile] = useState(null);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [gstFile, setGstFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (recordToEdit) {
      const predefinedCompanies = COMPANIES_BY_CATEGORY[recordToEdit.category] || [];
      const isOtherCompany = recordToEdit.company && !predefinedCompanies.includes(recordToEdit.company);
      
      const isOtherVehicle = recordToEdit.vehicleType && !MOTOR_VEHICLE_TYPES.includes(recordToEdit.vehicleType);

      setForm({
        ...recordToEdit,
        company: isOtherCompany ? "OTHERS" : recordToEdit.company,
        customCompany: isOtherCompany ? recordToEdit.company : "",
        vehicleType: isOtherVehicle ? "MISC D: OTHER" : recordToEdit.vehicleType,
        customVehicleType: isOtherVehicle ? recordToEdit.vehicleType : ""
      });
    } else {
      setForm(initialFormState);
    }
  }, [recordToEdit]);

  const uploadFile = async (file, path) => {
    if (!file) return "";
    const storageRef = ref(storage, path);
    const metadata = {
      contentType: file.type,
    };
    await uploadBytes(storageRef, file, metadata);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const isMF = form.category === "MutualFund";
      const idValue = isMF ? form.folioNo : form.policyNo;
      const fileId = idValue || Date.now();
      const timestamp = Date.now();
      
      const now = new Date();
      const currentMonth = (now.getMonth() + 1).toString().padStart(2, "0");
      const currentYear = now.getFullYear().toString();

      const [aadhaarFrontUrl, aadhaarBackUrl, panFrontUrl, panBackUrl, policyUrl, policyDocUrl, invoiceUrl, gstUrl] = await Promise.all([
        uploadFile(aadhaarFrontFile, `dataRecords/${form.category}/${timestamp}_${fileId}_aadhaar_front`),
        uploadFile(aadhaarBackFile, `dataRecords/${form.category}/${timestamp}_${fileId}_aadhaar_back`),
        uploadFile(panFrontFile, `dataRecords/${form.category}/${timestamp}_${fileId}_pan_front`),
        uploadFile(panBackFile, `dataRecords/${form.category}/${timestamp}_${fileId}_pan_back`),
        uploadFile(policyFile, `dataRecords/${form.category}/${timestamp}_${fileId}_policy`),
        uploadFile(policyDocFile, `dataRecords/${form.category}/${timestamp}_${fileId}_policyDoc`),
        uploadFile(invoiceFile, `dataRecords/${form.category}/${timestamp}_${fileId}_invoice`),
        uploadFile(gstFile, `dataRecords/${form.category}/${timestamp}_${fileId}_gst`)
      ]);

      const finalCompany = form.company === "OTHERS" ? form.customCompany : form.company;
      const finalVehicleType = form.vehicleType === "MISC D: OTHER" ? form.customVehicleType : form.vehicleType;

      const dataToSave = {
        ...form,
        company: finalCompany,
        vehicleType: finalVehicleType,
        addedBy: currentUser?.id || "admin",
        addedByName: currentUser?.name || "Super Admin",
      };

      // Remove custom fields from firestore data
      delete dataToSave.customCompany;
      delete dataToSave.customVehicleType;

      if (aadhaarFrontUrl) dataToSave.aadhaarFrontPhoto = aadhaarFrontUrl;
      if (aadhaarBackUrl) dataToSave.aadhaarBackPhoto = aadhaarBackUrl;
      if (panFrontUrl) dataToSave.panFrontPhoto = panFrontUrl;
      if (panBackUrl) dataToSave.panBackPhoto = panBackUrl;
      if (policyUrl) dataToSave.policyPhoto = policyUrl;
      if (policyDocUrl) dataToSave.policyDocPhoto = policyDocUrl;
      if (invoiceUrl) dataToSave.invoicePhoto = invoiceUrl;
      if (gstUrl) dataToSave.gstPhoto = gstUrl;

      if (recordToEdit) {
        await updateDoc(doc(db, "dataEntries", recordToEdit.id), {
          ...dataToSave,
          updatedAt: serverTimestamp()
        });
        
        // Sync to Google Sheets
        try {
          const settingsSnap = await getDoc(doc(db, "settings", "googleSheets"));
          if (settingsSnap.exists() && settingsSnap.data().webAppUrl) {
            const syncData = { id: recordToEdit.id, ...dataToSave };
            await syncToGoogleSheets(stripSheetOnlyFields(syncData), form.category, settingsSnap.data().webAppUrl);
          }
        } catch (err) { console.error("Sheet Sync Error:", err); }

        toast.success("Record Updated Successfully!");
        if (onFinished) onFinished();
      } else {
        // Calculate Sequential SL NO for the current month and category
        // Fetch matching records and find max slNo in JS to avoid composite index requirement
        const qGroup = query(
          collection(db, "dataEntries"),
          where("category", "==", form.category),
          where("entryMonth", "==", currentMonth),
          where("entryYear", "==", currentYear)
        );
        const groupSnap = await getDocs(qGroup);
        let nextSlNo = 1;
        if (!groupSnap.empty) {
          const slNos = groupSnap.docs.map(d => d.data().slNo || 0);
          nextSlNo = Math.max(...slNos) + 1;
        }

        const docRef = await addDoc(collection(db, "dataEntries"), {
          ...dataToSave,
          slNo: nextSlNo,
          entryMonth: currentMonth,
          entryYear: currentYear,
          createdAt: serverTimestamp()
        });

        // Sync to Google Sheets
        try {
          const settingsSnap = await getDoc(doc(db, "settings", "googleSheets"));
          if (settingsSnap.exists() && settingsSnap.data().webAppUrl) {
            const syncData = { 
              id: docRef.id,
              ...dataToSave, 
              slNo: nextSlNo, 
              entryMonth: currentMonth, 
              entryYear: currentYear 
            };
            await syncToGoogleSheets(stripSheetOnlyFields(syncData), form.category, settingsSnap.data().webAppUrl);
          }
        } catch (err) { console.error("Sheet Sync Error:", err); }

        toast.success("Record Added Successfully!");
        setForm(initialFormState);
        setAadhaarFrontFile(null);
        setAadhaarBackFile(null);
        setPanFrontFile(null);
        setPanBackFile(null);
        setPolicyFile(null);
        setPolicyDocFile(null);
        setInvoiceFile(null);
        setGstFile(null);
      }
    } catch (e) {
      toast.error(`Error ${recordToEdit ? "updating" : "adding"} record: ` + e.message);
    }
    setLoading(false);
  };

  const inputStyle = { background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, padding: 10, color: "#1e293b", outline: "none", width: "100%" };
  const labelStyle = { fontSize: 12, color: "#475569", marginBottom: 5, display: "block" };

  const renderField = (label, name, type = "text", options = null) => (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <label style={labelStyle}>{label}</label>
      {options ? (
        <select value={form[name]} onChange={e => setForm({ ...form, [name]: e.target.value })} style={inputStyle}>
          <option value="">Select {label}</option>
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <input type={type} value={form[name]} onChange={e => setForm({ ...form, [name]: e.target.value })} style={inputStyle} placeholder={`Enter ${label}`} />
      )}
    </div>
  );

  return (
    <div>
      <h1 style={{ color: "#1e293b", fontSize: isMobile ? 22 : 26, fontWeight: 800, marginBottom: 20 }}>Fill Data Records</h1>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? 20 : 32, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
        <div style={{ marginBottom: 25 }}>
          <label style={labelStyle}>Insurance Category</label>
          <select value={form.category} onChange={e => setForm({ ...initialFormState, category: e.target.value })} style={{ ...inputStyle, fontSize: 16, fontWeight: 700, borderColor: "#1e90ff" }}>
            <option value="Motor">Motor Insurance</option>
            <option value="Health">Health Insurance</option>
            <option value="SME">SME Insurance</option>
            <option value="Life">Life Insurance</option>
            <option value="MutualFund">Mutual Fund</option>
          </select>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 20 }}>
          {form.category === "Motor" && renderField("Vehicle Number", "vehicleNumber")}
          {renderField("Policy No", "policyNo")}
          {renderField("Mobile No", "mobileNo")}
          {renderField("IMD Code", "imdCode")}
          {renderField("Name", "name")}
          <div style={{ display: "flex", flexDirection: "column", gap: form.company === "OTHERS" ? 10 : 0 }}>
            {renderField(
              form.category === "Motor" 
                ? "Company" 
                : form.category === "MutualFund" 
                  ? "Mutual Fund Company" 
                  : "Insurance Company", 
              "company",
              "text",
              COMPANIES_BY_CATEGORY[form.category] || []
            )}
            {form.company === "OTHERS" && (
              <input 
                type="text" 
                value={form.customCompany} 
                onChange={e => setForm({ ...form, customCompany: e.target.value })} 
                style={inputStyle} 
                placeholder="Enter Company Name" 
              />
            )}
          </div>
          
          {form.category === "Motor" && (
            <>
              {renderField("Make", "make")}
              {renderField("Model", "model")}
              <div style={{ display: "flex", flexDirection: "column", gap: form.vehicleType === "MISC D: OTHER" ? 10 : 0 }}>
                {renderField("Vehicle Type", "vehicleType", "select", MOTOR_VEHICLE_TYPES)}
                {form.vehicleType === "MISC D: OTHER" && (
                  <input 
                    type="text" 
                    value={form.customVehicleType} 
                    onChange={e => setForm({ ...form, customVehicleType: e.target.value })} 
                    style={inputStyle} 
                    placeholder="Enter Vehicle Type" 
                  />
                )}
              </div>
              {renderField("Policy Type", "policyType", "select", ["COMPREHENSIVE", "SAOD", "THIRD PARTY"])}
            </>
          )}

          {form.category === "Health" && (
            <>
              {renderField("Business Type", "subType", "select", ["New", "Renewal", "Port"])}
              {renderField("Plan Name", "plan")}
              {renderField("Sum Assured", "sumAssured")}
              {renderField("Family Members", "familyMembers", "select", HEALTH_FAMILY_MEMBERS)}
              {renderField("Bonus", "bonus")}
            </>
          )}

          {form.category === "SME" && (
            <>
              {renderField("Insurance Type", "subType", "select", ["New", "Renewal"])}
              {renderField("Product Name", "productName")}
              {renderField("Sum Assured", "sumAssured")}
            </>
          )}

          {form.category === "Life" && (
            <>
              {renderField("Plan", "plan")}
              {renderField("Sum Assured", "sumAssured")}
              {renderField("Payment Type", "paymentType", "select", ["Monthly", "Quarterly", "Half-Yearly", "Yearly", "Single"])}
            </>
          )}

          {form.category === "MutualFund" && (
            <>
              {renderField("Folio No", "folioNo")}
              {renderField("Fund Name", "productName")}
              {renderField("Amount", "amount")}
            </>
          )}

          {renderField("Tenure", "tenure")}
          {form.category === "MutualFund" ? (
            <>
              {renderField("Payment Date", "paymentDate", "date")}
              {renderField("Next Payment Date", "nextPaymentDate", "date")}
            </>
          ) : (
            renderField("Risk start Date", "riskDate", "date")
          )}
          {renderField(form.category === "MutualFund" ? "Fund scheme end date" : "Risk End date", "endDate", "date")}
          {!["Health", "SME", "MutualFund"].includes(form.category) && (
            <>
              {renderField("OD", "od")}
              {renderField("TP", "tp")}
            </>
          )}
          {form.category !== "Health" && renderField("Net Prem", "netPrem")}
          {renderField("Total prem", "prem")}
          {renderField("Payout", "payout")}
          {renderField("Company %", "companyPercentage")}
          <div style={{ gridColumn: isMobile ? "span 1" : "span 2" }}>
            {renderField("Remarks", "remarks")}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={labelStyle}>Aadhaar Card Photo (Front)</label>
            <input type="file" accept="image/*,.pdf,application/pdf" onChange={e => setAadhaarFrontFile(e.target.files[0])} style={inputStyle} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={labelStyle}>Aadhaar Card Photo (Back)</label>
            <input type="file" accept="image/*,.pdf,application/pdf" onChange={e => setAadhaarBackFile(e.target.files[0])} style={inputStyle} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={labelStyle}>Pan Card Photo (Front)</label>
            <input type="file" accept="image/*,.pdf,application/pdf" onChange={e => setPanFrontFile(e.target.files[0])} style={inputStyle} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={labelStyle}>Pan Card Photo (Back)</label>
            <input type="file" accept="image/*,.pdf,application/pdf" onChange={e => setPanBackFile(e.target.files[0])} style={inputStyle} />
          </div>
          {form.category === "Motor" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={labelStyle}>Policy Document</label>
              <input type="file" accept="image/*,.pdf,application/pdf" onChange={e => setPolicyDocFile(e.target.files[0])} style={inputStyle} />
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={labelStyle}>{form.category === "Motor" ? "Misc Document" : "Policy Document"}</label>
            <input type="file" accept="image/*,.pdf,application/pdf" onChange={e => setPolicyFile(e.target.files[0])} style={inputStyle} />
          </div>

          {form.category === "SME" && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={labelStyle}>Invoice PDF</label>
                <input type="file" accept="image/*,.pdf,application/pdf" onChange={e => setInvoiceFile(e.target.files[0])} style={inputStyle} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={labelStyle}>GST PDF</label>
                <input type="file" accept="image/*,.pdf,application/pdf" onChange={e => setGstFile(e.target.files[0])} style={inputStyle} />
              </div>
            </>
          )}

          <button type="submit" disabled={loading} style={{ gridColumn: "1 / -1", background: "#1e90ff", color: "#fff", border: "none", borderRadius: 8, padding: 16, fontWeight: 700, fontSize: 16, cursor: loading ? "not-allowed" : "pointer", marginTop: 10 }}>
            {loading ? "Uploading & Saving..." : "Save Record"}
          </button>
        </form>
      </div>
    </div>
  );
};

const UserRecord = ({ isMobile, currentUser }) => {
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState("Motor");
  const [searchTerm, setSearchTerm] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingDocs, setViewingDocs] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "dataEntries"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const filteredEntries = entries.filter(ent => {
    const matchesCategory = ent.category === filter;
    const matchesSearch = (ent.mobileNo || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (ent.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMonth = monthFilter === "" || ent.entryMonth === monthFilter;
    const matchesYear = yearFilter === "" || ent.entryYear === yearFilter;
    return matchesCategory && matchesSearch && matchesMonth && matchesYear;
  });

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        await deleteDoc(doc(db, "dataEntries", id));
        toast.success("Record deleted successfully!");
      } catch (e) {
        toast.error("Error deleting record: " + e.message);
      }
    }
  };

  const motorHeaders = ["SL", "Month", "Vehicle No", "Policy No", "Make", "Model", "IMD Code", "Mobile No", "Name", "Company", "Vehicle Type", "Policy Type", "Tenure", "Risk start Date", "Risk End date", "OD", "TP", "Net Prem", "Total prem", "Payout", "Co%", "Remarks", "Actions"];
  const healthHeaders = ["SL", "Month", "Policy No", "Company", "Business Type", "Plan Name", "IMD Code", "Mobile No", "Name", "Sum Assured", "Family", "Bonus", "Tenure", "Risk start Date", "Risk End date", "Total prem", "Payout", "Co%", "Remarks", "Actions"];
  const smeHeaders = ["SL", "Month", "Policy No", "Company", "Type", "IMD Code", "Mobile No", "Product", "Name", "Sum Assured", "Tenure", "Risk start Date", "Risk End date", "Net Prem", "Total prem", "Payout", "Co%", "Remarks", "Actions"];
  const lifeHeaders = ["SL", "Month", "Policy No", "Company", "Plan", "IMD Code", "Mobile No", "Name", "Sum Assured", "Payment Type", "Tenure", "Risk start Date", "Risk End date", "OD", "TP", "Net Prem", "Total prem", "Payout", "Co%", "Remarks", "Actions"];
  const mfHeaders = ["SL", "Month", "Folio No", "Company", "Fund Name", "IMD Code", "Mobile No", "Name", "Amount", "Payment Date", "Next Payment", "Tenure", "Risk start Date", "Risk End date", "Net Prem", "Total prem", "Payout", "Co%", "Remarks", "Actions"];

  const getHeaders = () => {
    if (filter === "Motor") return motorHeaders;
    if (filter === "Health") return healthHeaders;
    if (filter === "SME") return smeHeaders;
    if (filter === "Life") return lifeHeaders;
    if (filter === "MutualFund") return mfHeaders;
    return [];
  };

  const renderCell = (val) => (
    <td style={{ padding: "12px 15px", color: "#1e293b", fontSize: 12, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>
      {val || "-"}
    </td>
  );

  const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 20, flexWrap: "wrap" }}>
        <h1 style={{ color: "#1e293b", fontSize: isMobile ? 22 : 26, fontWeight: 800 }}>User Record View</h1>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select 
            value={monthFilter} 
            onChange={(e) => setMonthFilter(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", background: "#fff" }}
          >
            <option value="">All Months</option>
            {months.map(m => <option key={m} value={m}>{new Date(2000, parseInt(m)-1).toLocaleString('default', { month: 'long' })}</option>)}
          </select>
          <select 
            value={yearFilter} 
            onChange={(e) => setYearFilter(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", background: "#fff" }}
          >
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div style={{ position: "relative" }}>
            <input 
              type="text" 
              placeholder="Search Name/Phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                padding: "8px 12px", 
                borderRadius: 8, 
                border: "1px solid #e2e8f0", 
                fontSize: 14, 
                outline: "none",
                width: isMobile ? "100%" : 200
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {["Motor", "Health", "SME", "Life", "MutualFund"].map(cat => (
              <button key={cat} onClick={() => setFilter(cat)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: filter === cat ? "#1e90ff" : "#f1f5f9", color: filter === cat ? "#fff" : "#475569", cursor: "pointer", fontWeight: 600, fontSize: 12 }}>{cat}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {getHeaders().map(h => (
                  <th key={h} style={{ padding: "12px 15px", color: "#64748b", fontSize: 10, fontWeight: 700, textAlign: "left", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                ))}
                <th style={{ padding: "12px 15px", color: "#64748b", fontSize: 10, fontWeight: 700, textAlign: "left", textTransform: "uppercase" }}>Docs</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((ent, idx) => (
                <tr key={ent.id}>
                  {filter === "Motor" && (
                    <>
                      {renderCell(ent.slNo || idx + 1)}
                      {renderCell(ent.entryMonth ? `${ent.entryMonth}/${ent.entryYear}` : "-")}
                      {renderCell(ent.vehicleNumber)}
                      {renderCell(ent.policyNo)}
                      {renderCell(ent.make)}
                      {renderCell(ent.model)}
                      {renderCell(ent.imdCode)}
                      {renderCell(ent.mobileNo)}
                      {renderCell(ent.name)}
                      {renderCell(ent.company)}
                      {renderCell(ent.vehicleType)}
                      {renderCell(ent.policyType)}
                      {renderCell(ent.tenure)}
                      {renderCell(ent.riskDate)}
                      {renderCell(ent.endDate)}
                      {renderCell(ent.od)}
                      {renderCell(ent.tp)}
                      {renderCell(ent.netPrem)}
                      {renderCell(ent.prem)}
                      {renderCell(ent.payout)}
                      {renderCell(ent.companyPercentage)}
                      {renderCell(ent.remarks)}
                    </>
                  )}
                  {filter === "Health" && (
                    <>
                      {renderCell(ent.slNo || idx + 1)}
                      {renderCell(ent.entryMonth ? `${ent.entryMonth}/${ent.entryYear}` : "-")}
                      {renderCell(ent.policyNo)}
                      {renderCell(ent.company)}
                      {renderCell(ent.subType)}
                      {renderCell(ent.plan)}
                      {renderCell(ent.imdCode)}
                      {renderCell(ent.mobileNo)}
                      {renderCell(ent.name)}
                      {renderCell(ent.sumAssured)}
                      {renderCell(ent.familyMembers)}
                      {renderCell(ent.bonus)}
                      {renderCell(ent.tenure)}
                      {renderCell(ent.riskDate)}
                      {renderCell(ent.endDate)}
                      {renderCell(ent.prem)}
                      {renderCell(ent.payout)}
                      {renderCell(ent.companyPercentage)}
                      {renderCell(ent.remarks)}
                    </>
                  )}
                  {filter === "SME" && (
                    <>
                      {renderCell(ent.slNo || idx + 1)}
                      {renderCell(ent.entryMonth ? `${ent.entryMonth}/${ent.entryYear}` : "-")}
                      {renderCell(ent.policyNo)}
                      {renderCell(ent.company)}
                      {renderCell(ent.subType)}
                      {renderCell(ent.imdCode)}
                      {renderCell(ent.mobileNo)}
                      {renderCell(ent.productName)}
                      {renderCell(ent.name)}
                      {renderCell(ent.sumAssured)}
                      {renderCell(ent.tenure)}
                      {renderCell(ent.riskDate)}
                      {renderCell(ent.endDate)}
                      {renderCell(ent.netPrem)}
                      {renderCell(ent.prem)}
                      {renderCell(ent.payout)}
                      {renderCell(ent.companyPercentage)}
                      {renderCell(ent.remarks)}
                    </>
                  )}
                  {filter === "Life" && (
                    <>
                      {renderCell(ent.slNo || idx + 1)}
                      {renderCell(ent.entryMonth ? `${ent.entryMonth}/${ent.entryYear}` : "-")}
                      {renderCell(ent.policyNo)}
                      {renderCell(ent.company)}
                      {renderCell(ent.plan)}
                      {renderCell(ent.imdCode)}
                      {renderCell(ent.mobileNo)}
                      {renderCell(ent.name)}
                      {renderCell(ent.sumAssured)}
                      {renderCell(ent.paymentType)}
                      {renderCell(ent.tenure)}
                      {renderCell(ent.riskDate)}
                      {renderCell(ent.endDate)}
                      {renderCell(ent.od)}
                      {renderCell(ent.tp)}
                      {renderCell(ent.netPrem)}
                      {renderCell(ent.prem)}
                      {renderCell(ent.payout)}
                      {renderCell(ent.companyPercentage)}
                      {renderCell(ent.remarks)}
                    </>
                  )}
                  {filter === "MutualFund" && (
                    <>
                      {renderCell(ent.slNo || idx + 1)}
                      {renderCell(ent.entryMonth ? `${ent.entryMonth}/${ent.entryYear}` : "-")}
                      {renderCell(ent.folioNo)}
                      {renderCell(ent.company)}
                      {renderCell(ent.productName)}
                      {renderCell(ent.imdCode)}
                      {renderCell(ent.mobileNo)}
                      {renderCell(ent.name)}
                      {renderCell(ent.amount)}
                      {renderCell(ent.paymentDate)}
                      {renderCell(ent.nextPaymentDate)}
                      {renderCell(ent.tenure)}
                      {renderCell(ent.riskDate)}
                      {renderCell(ent.endDate)}
                      {renderCell(ent.netPrem)}
                      {renderCell(ent.prem)}
                      {renderCell(ent.payout)}
                      {renderCell(ent.companyPercentage)}
                      {renderCell(ent.remarks)}
                    </>
                  )}
                  <td style={{ padding: "12px 15px", borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button 
                        onClick={() => setEditingRecord(ent)}
                        style={{ background: "#1e90ff", color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                      >
                        EDIT
                      </button>
                      <button 
                        onClick={() => handleDelete(ent.id)}
                        style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                      >
                        DELETE
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: "12px 15px", borderBottom: "1px solid #e2e8f0" }}>
                    <button 
                      onClick={() => setViewingDocs(ent)}
                      style={{ background: "#f8fafc", color: "#1e90ff", border: "1px solid #1e90ff", borderRadius: 4, padding: "4px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                    >
                      VIEW DOCS
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredEntries.length === 0 && (
          <EmptyState icon="🗂️" title="No Records" subtitle={`No ${filter} insurance records found.`} />
        )}
      </div>

      {viewingDocs && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, position: "relative", border: "1px solid #e2e8f0", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ margin: 0, color: "#1e293b", fontSize: 18, fontWeight: 800 }}>Record Documents</h3>
                <button onClick={() => setViewingDocs(null)} style={{ background: "transparent", border: "none", color: "#64748b", fontSize: 24, cursor: "pointer" }}>&times;</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {viewingDocs.aadhaarFrontPhoto && <a href={viewingDocs.aadhaarFrontPhoto} target="_blank" rel="noreferrer" style={{ color: "#1e90ff", fontSize: 13, fontWeight: 700, textDecoration: "none", background: "#f0f9ff", padding: "12px 16px", borderRadius: 8, border: "1px solid #e0f2fe", textAlign: "center" }}>AADHAAR CARD (FRONT)</a>}
                {viewingDocs.aadhaarBackPhoto && <a href={viewingDocs.aadhaarBackPhoto} target="_blank" rel="noreferrer" style={{ color: "#1e90ff", fontSize: 13, fontWeight: 700, textDecoration: "none", background: "#f0f9ff", padding: "12px 16px", borderRadius: 8, border: "1px solid #e0f2fe", textAlign: "center" }}>AADHAAR CARD (BACK)</a>}
                {viewingDocs.panFrontPhoto && <a href={viewingDocs.panFrontPhoto} target="_blank" rel="noreferrer" style={{ color: "#1e90ff", fontSize: 13, fontWeight: 700, textDecoration: "none", background: "#f0f9ff", padding: "12px 16px", borderRadius: 8, border: "1px solid #e0f2fe", textAlign: "center" }}>PAN CARD (FRONT)</a>}
                {viewingDocs.panBackPhoto && <a href={viewingDocs.panBackPhoto} target="_blank" rel="noreferrer" style={{ color: "#1e90ff", fontSize: 13, fontWeight: 700, textDecoration: "none", background: "#f0f9ff", padding: "12px 16px", borderRadius: 8, border: "1px solid #e0f2fe", textAlign: "center" }}>PAN CARD (BACK)</a>}
                {viewingDocs.policyDocPhoto && <a href={viewingDocs.policyDocPhoto} target="_blank" rel="noreferrer" style={{ color: "#1e90ff", fontSize: 13, fontWeight: 700, textDecoration: "none", background: "#f0f9ff", padding: "12px 16px", borderRadius: 8, border: "1px solid #e0f2fe", textAlign: "center" }}>POLICY DOCUMENT</a>}
                {viewingDocs.policyPhoto && <a href={viewingDocs.policyPhoto} target="_blank" rel="noreferrer" style={{ color: "#1e90ff", fontSize: 13, fontWeight: 700, textDecoration: "none", background: "#f0f9ff", padding: "12px 16px", borderRadius: 8, border: "1px solid #e0f2fe", textAlign: "center" }}>{filter === "Motor" ? "MISC DOCUMENT" : "POLICY DOCUMENT"}</a>}
                {viewingDocs.invoicePhoto && <a href={viewingDocs.invoicePhoto} target="_blank" rel="noreferrer" style={{ color: "#1e90ff", fontSize: 13, fontWeight: 700, textDecoration: "none", background: "#f0f9ff", padding: "12px 16px", borderRadius: 8, border: "1px solid #e0f2fe", textAlign: "center" }}>INVOICE PDF</a>}
                {viewingDocs.gstPhoto && <a href={viewingDocs.gstPhoto} target="_blank" rel="noreferrer" style={{ color: "#1e90ff", fontSize: 13, fontWeight: 700, textDecoration: "none", background: "#f0f9ff", padding: "12px 16px", borderRadius: 8, border: "1px solid #e0f2fe", textAlign: "center" }}>GST PDF</a>}
                {(!viewingDocs.aadhaarFrontPhoto && !viewingDocs.aadhaarBackPhoto && !viewingDocs.panFrontPhoto && !viewingDocs.panBackPhoto && !viewingDocs.policyDocPhoto && !viewingDocs.policyPhoto && !viewingDocs.invoicePhoto && !viewingDocs.gstPhoto) && (
                  <p style={{ textAlign: "center", color: "#64748b", fontSize: 14 }}>No documents uploaded for this record.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {editingRecord && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 1000, maxHeight: "90vh", overflowY: "auto", position: "relative", border: "1px solid #e2e8f0", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
            <button 
              onClick={() => setEditingRecord(null)} 
              style={{ position: "absolute", top: 20, right: 20, background: "transparent", border: "none", color: "#1e293b", fontSize: 24, cursor: "pointer", zIndex: 1 }}
            >
              &times;
            </button>
            <div style={{ padding: isMobile ? 20 : 40 }}>
              <DataRecord 
                isMobile={isMobile} 
                currentUser={currentUser} 
                recordToEdit={editingRecord} 
                onFinished={() => setEditingRecord(null)} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CreateUser = ({ isMobile }) => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "User", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, "users"), { ...form, createdAt: serverTimestamp() });
      setForm({ name: "", email: "", phone: "", role: "User", password: "" });
      toast.success("User created successfully!");
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? 20 : 32, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
       <h1 style={{ color: "#1e293b", fontSize: isMobile ? 20 : 22, marginBottom: 20 }}>Create New User</h1>
       <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full Name" style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10, padding: 12, color: "#1e293b" }} />
          <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10, padding: 12, color: "#1e293b" }} />
          <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone" style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10, padding: 12, color: "#1e293b" }} />
          <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Password" type="password" style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10, padding: 12, color: "#1e293b" }} />
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10, padding: 12, color: "#1e293b" }}>
            <option value="User">Created User (Access: Data Records Only)</option>
            <option value="Admin">Admin (Full Access)</option>
          </select>
       </div>
       <button onClick={handleSubmit} disabled={loading} style={{ marginTop: 24, background: "#1e90ff", color: "#fff", border: "none", borderRadius: 10, padding: "12px 32px", cursor: loading ? "not-allowed" : "pointer", width: isMobile ? "100%" : "auto" }}>
         {loading ? "Creating..." : "Create User"}
       </button>
    </div>
  );
};

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (email === "admin@smr.com" && password === "admin123") {
      onLogin({ email, name: "Super Admin", role: "Admin" });
      return;
    }
    const q = query(collection(db, "users"));
    const snapshot = await getDocs(q);
    const user = snapshot.docs.find(d => d.data().email === email && d.data().password === password);
    if (user) onLogin({ id: user.id, ...user.data() });
    else toast.error("Invalid credentials (Try: admin@smr.com / admin123)");
  };

  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", padding: 20 }}>
      <Toaster position="top-right" reverseOrder={false} />
      <div style={{ background: "#fff", padding: "40px 24px", borderRadius: 20, border: "1px solid #e2e8f0", width: "100%", maxWidth: 350, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Logo />
        </div>
        <h2 style={{ color: "#1e293b", marginTop: 24, fontSize: 24, fontWeight: 700, textAlign: "center" }}>Admin Login</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10, padding: 12, color: "#1e293b", outline: "none" }} />
          <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10, padding: 12, color: "#1e293b", outline: "none" }} />
          <button onClick={handleLogin} style={{ background: "#1e90ff", color: "#fff", border: "none", borderRadius: 10, padding: 14, cursor: "pointer", fontWeight: 700, marginTop: 8 }}>Login</button>
        </div>
      </div>
    </div>
  );
};

const SyncSettings = ({ isMobile }) => {
  const [url, setUrl] = useState("");
  const [savedUrl, setSavedUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, "settings", "googleSheets"));
        if (docSnap.exists()) {
          const storedUrl = docSnap.data().webAppUrl || "";
          setUrl(storedUrl);
          setSavedUrl(storedUrl);
        }
      } catch (e) {
        console.error("Error fetching sync settings:", e);
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!url.startsWith("https://script.google.com")) {
      return toast.error("Please enter a valid Google Apps Script URL.");
    }
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "googleSheets"), { webAppUrl: url }, { merge: true });
      setSavedUrl(url);
      await syncExistingRecordsToSheet(url);
      toast.success("Google Sheets URL saved!");
    } catch (e) {
      toast.error("Error saving URL: " + e.message);
    }
    setSaving(false);
  };

  const handleTestSync = async () => {
    if (!url) return toast.error("Please save the Web App URL first.");

    setTesting(true);
    try {
      const testRecord = {
        id: `ui-test-${Date.now()}`,
        slNo: "TEST",
        entryMonth: new Date().getMonth() + 1,
        entryYear: new Date().getFullYear(),
        category: "Motor",
        policyNo: "UI-TEST",
        name: "Dashboard Test Sync",
        mobileNo: "",
        remarks: "Triggered from Admin > Sync Settings"
      };
      await syncToGoogleSheets(testRecord, "Motor", url);
      toast.success("Test sync sent. Check the Motor tab.");
    } catch (e) {
      toast.error("Test sync failed: " + e.message);
    }
    setTesting(false);
  };

  const handleSyncAll = async () => {
    if (!url) return toast.error("Please save the Web App URL first.");
    if (!window.confirm("This will sync ALL existing records from database to Google Sheets. Continue?")) return;
    
    setSyncingAll(true);
    try {
      const snapshot = await getDocs(collection(db, "dataEntries"));
      const allEntries = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(`${a.entryYear || 0}-${a.entryMonth || 1}-01`).getTime();
          const bTime = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(`${b.entryYear || 0}-${b.entryMonth || 1}-01`).getTime();
          return aTime - bTime;
        });

      for (const cat of SYNC_CATEGORIES) {
        const catEntries = allEntries.filter(e => e.category === cat);
        if (catEntries.length > 0) {
          await syncCategoryRecordsToSheet(catEntries, cat, url, true);
        }
      }
      toast.success("All data synced successfully!");
    } catch (e) {
      toast.error("Error syncing data: " + e.message);
    }
    setSyncingAll(false);
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading settings...</div>;

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? 20 : 32, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
      <h1 style={{ color: "#1e293b", fontSize: isMobile ? 22 : 26, fontWeight: 800, marginBottom: 20 }}>Google Sheets Synchronization</h1>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14, lineHeight: 1.5 }}>
        Automatically sync database records to your Google Sheet. When you add or edit a record, it will immediately reflect in the corresponding sheet tab.
      </p>
      
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 12, color: "#475569", marginBottom: 8, display: "block", fontWeight: 700 }}>Google Apps Script Web App URL</label>
        <input 
          type="text" 
          value={url} 
          onChange={e => setUrl(e.target.value)} 
          placeholder="https://script.google.com/macros/s/.../exec"
          style={{ width: "100%", padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", outline: "none", fontSize: 14 }}
        />
        <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
          <div style={{ marginBottom: 4 }}>Loaded from Firestore:</div>
          <div style={{ fontFamily: "monospace", wordBreak: "break-all", color: savedUrl ? "#1e293b" : "#ef4444" }}>
            {savedUrl || "No URL saved yet"}
          </div>
        </div>
      </div>
      
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <button 
          onClick={handleSave} 
          disabled={saving}
          style={{ background: "#1e90ff", color: "#fff", border: "none", borderRadius: 8, padding: "12px 24px", fontWeight: 700, cursor: "pointer", transition: "0.2s" }}
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        
        <button 
          onClick={handleSyncAll} 
          disabled={syncingAll || !url}
          style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: 8, padding: "12px 24px", fontWeight: 700, cursor: syncingAll || !url ? "not-allowed" : "pointer", opacity: syncingAll || !url ? 0.7 : 1 }}
        >
          {syncingAll ? "Syncing All Records..." : "Sync All Existing Data to Sheets"}
        </button>

        <button
          onClick={handleTestSync}
          disabled={testing || !url}
          style={{ background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, padding: "12px 24px", fontWeight: 700, cursor: testing || !url ? "not-allowed" : "pointer", opacity: testing || !url ? 0.7 : 1 }}
        >
          {testing ? "Sending Test..." : "Send Test Sync"}
        </button>
      </div>

      <div style={{ marginTop: 40, borderTop: "1px solid #e2e8f0", paddingTop: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#1e293b" }}>Setup Instructions:</h3>
        <ol style={{ fontSize: 14, color: "#475569", lineHeight: 1.8, paddingLeft: 20 }}>
          <li>Open your Google Sheet: <a href="https://docs.google.com/spreadsheets/d/1Ftu7ivwR8aWZ8g3tgvLmikIB7D93eHaaVoINMZLlCuE/edit?gid=0#gid=0" target="_blank" rel="noreferrer" style={{ color: "#1e90ff" }}>Open Sheet</a></li>
          <li>Go to <b>Extensions &gt; Apps Script</b>.</li>
          <li>Paste the code from <b>frontend/google-apps-script.js</b>.</li>
          <li>Click <b>Deploy &gt; New Deployment</b>.</li>
          <li>Select <b>Type: Web App</b>.</li>
          <li>Set "Execute as" to <b>Me</b> and "Who has access" to <b>Anyone</b>.</li>
          <li>Click Deploy and authorize the permissions.</li>
          <li>Copy the <b>Web App URL</b> and paste it into the field above.</li>
        </ol>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem("adminUser")));
  const [active, setActive] = useState("records");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [collapsed, setCollapsed] = useState(window.innerWidth < 1024);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (currentUser?.role === "Admin") {
        const unsubscribe = onSnapshot(query(collection(db, "users"), orderBy("createdAt", "desc")), (snap) => {
          setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const ensureSpreadsheetBackfill = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, "settings", "googleSheets"));
        const webAppUrl = settingsSnap.exists() ? settingsSnap.data().webAppUrl : "";
        if (webAppUrl) {
          await syncExistingRecordsToSheet(webAppUrl);
        }
      } catch (error) {
        console.error("Initial sheet sync skipped:", error);
      }
    };

    ensureSpreadsheetBackfill();
  }, [currentUser]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!currentUser) return <Login onLogin={(u) => { setCurrentUser(u); localStorage.setItem("adminUser", JSON.stringify(u)); }} />;

  const navItems = [
    { key: "users", label: "All Users", icon: "👥", admin: true },
    { key: "create", label: "Create User", icon: "➕", admin: true },
    { key: "records", label: "Record Data", icon: "📊", admin: false },
    { key: "userrecord", label: "Find Data", icon: "🗂️", admin: true },
    { key: "sync", label: "Sync Settings", icon: "⚙️", admin: true },
  ];

  const filteredNavItems = currentUser.role === "Admin" ? navItems : navItems.filter(item => !item.admin);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f8fafc", color: "#1e293b", position: "relative", overflow: "hidden" }}>
      <Toaster position="top-right" reverseOrder={false} />
      {/* Sidebar Overlay for Mobile */}
      {isMobile && !collapsed && (
        <div 
          onClick={() => setCollapsed(true)}
          style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 999, backdropFilter: "blur(2px)" }}
        />
      )}

      {/* Sidebar */}
      <div style={{ 
        width: isMobile ? 260 : (collapsed ? 80 : 260), 
        background: "#fff", 
        borderRight: "1px solid #e2e8f0", 
        transition: "0.3s ease-in-out",
        position: isMobile ? "fixed" : "relative",
        left: isMobile && collapsed ? -260 : 0,
        height: "100vh",
        zIndex: 1000,
      }}>
        <div style={{ padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {(!collapsed || isMobile) ? <Logo /> : <span style={{ fontSize: 24, fontWeight: 900, color: "#1e90ff" }}>S</span>}
          {isMobile && <button onClick={() => setCollapsed(true)} style={{ background: "transparent", border: "none", color: "#64748b", fontSize: 24, cursor: "pointer" }}>&times;</button>}
        </div>
        <nav style={{ padding: 10 }}>
          {filteredNavItems.map(item => (
            <button key={item.key} onClick={() => { setActive(item.key); if (isMobile) setCollapsed(true); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 15px", marginBottom: 5, background: active === item.key ? "#1e90ff11" : "transparent", border: "none", color: active === item.key ? "#1e90ff" : "#64748b", cursor: "pointer", borderRadius: 8, transition: "0.2s" }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span> {(!collapsed || isMobile) && <span style={{ fontWeight: active === item.key ? 700 : 500 }}>{item.label}</span>}
            </button>
          ))}
          <button onClick={() => { localStorage.removeItem("adminUser"); setCurrentUser(null); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 15px", marginTop: 20, background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", borderRadius: 8 }}>
            <span>🚪</span> {(!collapsed || isMobile) && <span>Logout</span>}
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{ height: 64, borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "0 16px" : "0 24px", background: "#fff" }}>
           <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button onClick={() => setCollapsed(!collapsed)} style={{ background: "transparent", border: "none", color: "#1e293b", cursor: "pointer", fontSize: 20, padding: 8, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>☰</button>
              <h2 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{navItems.find(n => n.key === active)?.label}</h2>
           </div>
           <div style={{ textAlign: "right", minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser.name}</div>
                <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>{currentUser.role}</div>
           </div>
        </header>
        <main style={{ flex: 1, padding: isMobile ? 16 : 24, overflowY: "auto", background: "#f8fafc" }}>
          {active === "users" && <AllUsers isMobile={isMobile} users={users} />}
          {active === "records" && <DataRecord isMobile={isMobile} currentUser={currentUser} />}
          {active === "create" && <CreateUser isMobile={isMobile} />}
          {active === "userrecord" && <UserRecord isMobile={isMobile} currentUser={currentUser} />}
          {active === "sync" && <SyncSettings isMobile={isMobile} />}
        </main>
      </div>
    </div>
  );
}
