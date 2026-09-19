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

const ROLE_LABELS = {
  Admin: "Admin",
  DataEntry: "Data Entry",
  Advisor: "Advisor",
  SubAdvisor: "Sub Advisor",
};

// Accounts created before the Data Entry role existed are stored as "User" or "Employee".
const getPanelRole = (user) => {
  if (!user) return null;
  return ["Admin", "Advisor", "SubAdvisor"].includes(user.role) ? user.role : "DataEntry";
};

const AllUsers = ({ isMobile, users, currentUser }) => {
  const handleRoleChange = async (userId, role) => {
    try {
      await updateDoc(doc(db, "users", userId), { role });
      toast.success("Access updated successfully!");
    } catch (e) {
      toast.error("Error updating access: " + e.message);
    }
  };

  const handleRemove = async (userId, name) => {
    if (window.confirm(`Are you sure you want to remove ${name || "this user"}?`)) {
      try {
        await deleteDoc(doc(db, "users", userId));
        toast.success("User removed successfully!");
      } catch (e) {
        toast.error("Error removing user: " + e.message);
      }
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: "#1e293b", fontSize: isMobile ? 22 : 26, fontWeight: 800, fontFamily: "'Playfair Display', serif", marginBottom: 6 }}>User Data</h1>
        <p style={{ color: "#64748b", fontSize: 13 }}>Manage and monitor all registered users</p>
      </div>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
        <div style={{ padding: isMobile ? "16px" : "20px 24px", borderBottom: "1px solid #e2e8f0" }}>
          <span style={{ color: "#1e293b", fontWeight: 700, fontSize: 15 }}>User Directory</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["User", "Email", "Phone", "Access", "Password", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 20px", color: "#64748b", fontSize: 11, fontWeight: 700, textAlign: "left", letterSpacing: "1px", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = currentUser && user.id === currentUser.id;
                const userPanelRole = getPanelRole(user);
                const isPortalRole = userPanelRole === "Advisor" || userPanelRole === "SubAdvisor";
                return (
                  <tr key={user.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "12px 20px", color: "#1e293b", fontSize: 13 }}>{user.name}</td>
                    <td style={{ padding: "12px 20px", color: "#475569", fontSize: 13 }}>{user.email}</td>
                    <td style={{ padding: "12px 20px", color: "#475569", fontSize: 13 }}>{user.phone}</td>
                    <td style={{ padding: "12px 20px" }}>
                      {isPortalRole ? (
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{ROLE_LABELS[userPanelRole]}</span>
                      ) : (
                        <select
                          value={userPanelRole}
                          disabled={isSelf}
                          onChange={e => handleRoleChange(user.id, e.target.value)}
                          style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 10px", fontSize: 12, color: "#1e293b", cursor: isSelf ? "not-allowed" : "pointer" }}
                        >
                          <option value="Admin">{ROLE_LABELS.Admin}</option>
                          <option value="DataEntry">{ROLE_LABELS.DataEntry}</option>
                        </select>
                      )}
                    </td>
                    <td style={{ padding: "12px 20px", color: "#475569", fontSize: 13 }}>{user.password}</td>
                    <td style={{ padding: "12px 20px" }}>
                      <button
                        onClick={() => handleRemove(user.id, user.name)}
                        disabled={isSelf}
                        title={isSelf ? "You cannot remove your own account" : ""}
                        style={{ background: isSelf ? "#f1f5f9" : "#ef4444", color: isSelf ? "#94a3b8" : "#fff", border: "none", borderRadius: 4, padding: "6px 10px", fontSize: 10, fontWeight: 700, cursor: isSelf ? "not-allowed" : "pointer" }}
                      >
                        REMOVE
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <EmptyState icon="👥" title="No Users Found" subtitle="Registered users will appear here." />
        )}
      </div>
    </div>
  );
};

const MOTOR_VEHICLE_TYPES = [
  "CAR", "TWO WHEELER: SCOOTY", "TWO WHEELER: BIKE",
  "GCV: 0-2500KG", "GCV: 2500-3500KG", "GCV: 3500-7500KG",
  "GCV: 7500-12000KG", "GCV: 12000-16000KG", "GCV: 16000-55000KG",
  "PCV: SCHOOL BUS", "PCV: STAFF BUS", "PCV: PASSENGER BUS", "PCV: TAXI",
  "MISC D: TRACTOR", "MISC D: CRANE", "E RICKSHAW", "MISC D: OTHER"
];

const HEALTH_FAMILY_MEMBERS = [
  "1 Adult", "2 Adult", "2 Adult 1 child", "2 Adult 2 Child",
  "2 Adult 3 child", "1 Adult 1 Child", "1 Adult 2 child", "Others"
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
const SHEET_BACKFILL_VERSION = "v2";
const SHEET_BATCH_SIZE = 75;

const stripSheetOnlyFields = (record) => {
  const cleaned = { ...record };

  delete cleaned.createdAt;
  delete cleaned.updatedAt;
  delete cleaned.customCompany;
  delete cleaned.customVehicleType;
  delete cleaned.customFamilyMembers;

  Object.keys(cleaned).forEach((key) => {
    const lower = key.toLowerCase();
    if (lower.includes("photo") || lower.includes("pdf") || lower.includes("doc")) {
      delete cleaned[key];
    }
  });

  return cleaned;
};

const syncEntriesToSheet = async (entries, webAppUrl, replace = false) => {
  for (let i = 0; i < entries.length; i += SHEET_BATCH_SIZE) {
    const batch = entries.slice(i, i + SHEET_BATCH_SIZE).map(stripSheetOnlyFields);
    const batchCategory = batch[0]?.category || SYNC_CATEGORIES[0];
    await syncAllToGoogleSheets(batch, batchCategory, webAppUrl, replace && i === 0);
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

  if (allEntries.length > 0) {
    await syncEntriesToSheet(allEntries, webAppUrl, true);
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
    customFamilyMembers: "",
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

      const isOtherFamilyMembers = recordToEdit.familyMembers && !HEALTH_FAMILY_MEMBERS.includes(recordToEdit.familyMembers);

      setForm({
        ...recordToEdit,
        company: isOtherCompany ? "OTHERS" : recordToEdit.company,
        customCompany: isOtherCompany ? recordToEdit.company : "",
        vehicleType: isOtherVehicle ? "MISC D: OTHER" : recordToEdit.vehicleType,
        customVehicleType: isOtherVehicle ? recordToEdit.vehicleType : "",
        familyMembers: isOtherFamilyMembers ? "Others" : recordToEdit.familyMembers,
        customFamilyMembers: isOtherFamilyMembers ? recordToEdit.familyMembers : ""
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
      const finalFamilyMembers = form.familyMembers === "Others" ? form.customFamilyMembers : form.familyMembers;

      const dataToSave = {
        ...form,
        company: finalCompany,
        vehicleType: finalVehicleType,
        familyMembers: finalFamilyMembers,
        addedBy: currentUser?.id || "admin",
        addedByName: currentUser?.name || "Super Admin",
        advisorId: currentUser?.role === "Advisor" ? currentUser.consultantId
          : currentUser?.role === "SubAdvisor" ? currentUser.parentAdvisorId
          : (recordToEdit?.advisorId || ""),
        subAdvisorId: currentUser?.role === "SubAdvisor" ? currentUser.consultantId : (recordToEdit?.subAdvisorId || ""),
      };

      // Remove custom fields from firestore data
      delete dataToSave.customCompany;
      delete dataToSave.customVehicleType;
      delete dataToSave.customFamilyMembers;

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

  const renderFileInput = (label, file, setFile, fieldName, accept = "image/*,.pdf,application/pdf") => {
    const existingPhotoUrl = form[fieldName]; 

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <label style={labelStyle}>{label}</label>
        
        {file ? (
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between", 
            padding: "8px 12px", 
            background: "#f8fafc", 
            border: "1px dashed #cbd5e1", 
            borderRadius: 8,
            gap: 10
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              {file.type?.startsWith("image/") ? (
                <img 
                  src={URL.createObjectURL(file)} 
                  alt="preview" 
                  style={{ width: 36, height: 36, borderRadius: 4, objectFit: "cover" }} 
                />
              ) : (
                <span style={{ fontSize: 24 }}>📄</span>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ 
                  fontSize: 12, 
                  fontWeight: 600, 
                  color: "#1e293b", 
                  whiteSpace: "nowrap", 
                  overflow: "hidden", 
                  textOverflow: "ellipsis" 
                }}>
                  {file.name}
                </div>
                <div style={{ fontSize: 10, color: "#64748b" }}>
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setFile(null)}
              style={{ 
                background: "#fee2e2", 
                border: "none", 
                color: "#ef4444", 
                borderRadius: "50%", 
                width: 24, 
                height: 24, 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                cursor: "pointer",
                fontSize: 14,
                fontWeight: "bold",
                flexShrink: 0
              }}
              title="Remove document"
            >
              &times;
            </button>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <input 
              type="file" 
              accept={accept} 
              onChange={e => {
                if (e.target.files && e.target.files[0]) {
                  setFile(e.target.files[0]);
                }
              }} 
              style={inputStyle} 
            />
            {existingPhotoUrl && (
              <div style={{ marginTop: 4, fontSize: 11 }}>
                <span style={{ color: "#16a34a", fontWeight: 600 }}>✓ Already Uploaded: </span>
                <a 
                  href={existingPhotoUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  style={{ color: "#1e90ff", textDecoration: "underline" }}
                >
                  View Document
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

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
              <div style={{ display: "flex", flexDirection: "column", gap: form.familyMembers === "Others" ? 10 : 0 }}>
                {renderField("Family Members", "familyMembers", "select", HEALTH_FAMILY_MEMBERS)}
                {form.familyMembers === "Others" && (
                  <input
                    type="text"
                    value={form.customFamilyMembers}
                    onChange={e => setForm({ ...form, customFamilyMembers: e.target.value })}
                    style={inputStyle}
                    placeholder="Enter Family Members"
                  />
                )}
              </div>
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

          {renderFileInput("Aadhaar Card Photo (Front)", aadhaarFrontFile, setAadhaarFrontFile, "aadhaarFrontPhoto")}
          {renderFileInput("Aadhaar Card Photo (Back)", aadhaarBackFile, setAadhaarBackFile, "aadhaarBackPhoto")}
          {renderFileInput("Pan Card Photo (Front)", panFrontFile, setPanFrontFile, "panFrontPhoto")}
          {renderFileInput("Pan Card Photo (Back)", panBackFile, setPanBackFile, "panBackPhoto")}
          {form.category === "Motor" && renderFileInput("Policy Document", policyDocFile, setPolicyDocFile, "policyDocPhoto")}
          {renderFileInput(form.category === "Motor" ? "Misc Document" : "Policy Document", policyFile, setPolicyFile, "policyPhoto")}

          {form.category === "SME" && (
            <>
              {renderFileInput("Invoice PDF", invoiceFile, setInvoiceFile, "invoicePhoto")}
              {renderFileInput("GST PDF", gstFile, setGstFile, "gstPhoto")}
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

const UserRecord = ({ isMobile, currentUser, title = "Find Data", scopeMode = "admin", scopeId }) => {
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
    const targetId = scopeId || currentUser?.consultantId;
    const matchesScope = scopeMode === "advisor" ? !!targetId && ent.advisorId === targetId && !ent.subAdvisorId
      : scopeMode === "subadvisor" ? !!targetId && ent.subAdvisorId === targetId
      : true;
    return matchesCategory && matchesSearch && matchesMonth && matchesYear && matchesScope;
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

  const motorHeaders = ["SL", "Month", "Vehicle No", "Policy No", "Make", "Model", "IMD Code", "Mobile No", "Name", "Company", "Vehicle Type", "Policy Type", "Tenure", "Risk start Date", "Risk End date", "OD", "TP", "Net Prem", "Total prem", "Payout", "Co%", "Remarks", "Created By", "Actions"];
  const healthHeaders = ["SL", "Month", "Policy No", "Company", "Business Type", "Plan Name", "IMD Code", "Mobile No", "Name", "Sum Assured", "Family", "Bonus", "Tenure", "Risk start Date", "Risk End date", "Total prem", "Payout", "Co%", "Remarks", "Created By", "Actions"];
  const smeHeaders = ["SL", "Month", "Policy No", "Company", "Type", "IMD Code", "Mobile No", "Product", "Name", "Sum Assured", "Tenure", "Risk start Date", "Risk End date", "Net Prem", "Total prem", "Payout", "Co%", "Remarks", "Created By", "Actions"];
  const lifeHeaders = ["SL", "Month", "Policy No", "Company", "Plan", "IMD Code", "Mobile No", "Name", "Sum Assured", "Payment Type", "Tenure", "Risk start Date", "Risk End date", "OD", "TP", "Net Prem", "Total prem", "Payout", "Co%", "Remarks", "Created By", "Actions"];
  const mfHeaders = ["SL", "Month", "Folio No", "Company", "Fund Name", "IMD Code", "Mobile No", "Name", "Amount", "Payment Date", "Next Payment", "Tenure", "Risk start Date", "Risk End date", "Net Prem", "Total prem", "Payout", "Co%", "Remarks", "Created By", "Actions"];

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
        <h1 style={{ color: "#1e293b", fontSize: isMobile ? 22 : 26, fontWeight: 800 }}>{title}</h1>
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
                      {renderCell(ent.addedByName)}
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
                      {renderCell(ent.addedByName)}
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
                      {renderCell(ent.addedByName)}
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
                      {renderCell(ent.addedByName)}
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
                      {renderCell(ent.addedByName)}
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
  const initialFormState = { name: "", email: "", phone: "", password: "", userRole: "DataEntry", consultantId: "" };
  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [advisorOptions, setAdvisorOptions] = useState([]);

  useEffect(() => {
    if (form.userRole !== "Advisor") return;
    const q = query(collection(db, "consultants"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const topLevel = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => !c.parentAdvisorId);
      setAdvisorOptions(topLevel);
    });
    return () => unsubscribe();
  }, [form.userRole]);

  const handleSubmit = async () => {
    if (form.userRole === "Advisor" && !form.consultantId) {
      toast.error("Please select which advisor profile this login belongs to.");
      return;
    }
    setLoading(true);
    try {
      const { userRole, consultantId, ...rest } = form;
      const docData = userRole === "Advisor"
        ? { ...rest, role: "Advisor", consultantId, parentAdvisorId: "" }
        : { ...rest, role: userRole };
      await addDoc(collection(db, "users"), {
        ...docData,
        createdAt: serverTimestamp()
      });
      setForm(initialFormState);
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
          <div style={{ position: "relative" }}>
            <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Password" type={showPassword ? "text" : "password"} style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10, padding: 12, paddingRight: 44, color: "#1e293b", width: "100%" }} />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              tabIndex={-1}
              style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: 16, padding: 8, display: "flex", alignItems: "center", justifyContent: "center" }}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
       </div>

       <div style={{ marginTop: 24, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, fontWeight: 700 }}>Account Type</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {[
              { key: "Admin", label: "Admin (Main Admin Panel)" },
              { key: "DataEntry", label: "Data Entry (Data Entry Panel)" },
              { key: "Advisor", label: "Advisor (Advisor Panel)" },
            ].map(opt => (
              <label key={opt.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: opt.key === "Admin" ? 700 : 400, color: "#1e293b", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="userRole"
                  checked={form.userRole === opt.key}
                  onChange={() => setForm({ ...form, userRole: opt.key })}
                />
                {opt.label}
              </label>
            ))}
          </div>

          {form.userRole === "Advisor" && (
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 12, color: "#64748b", marginBottom: 8, display: "block" }}>Link to Advisor Profile</label>
              <select
                value={form.consultantId}
                onChange={e => setForm({ ...form, consultantId: e.target.value })}
                style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10, padding: 12, color: "#1e293b", width: "100%" }}
              >
                <option value="">Select Advisor Profile</option>
                {advisorOptions.map(a => (
                  <option key={a.id} value={a.id}>{a.name} {a.advisorId ? `(${a.advisorId})` : ""}</option>
                ))}
              </select>
              {advisorOptions.length === 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#ef4444" }}>No unlinked advisor profiles found. Create one first under "Create Advisor".</div>
              )}
            </div>
          )}
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
    else toast.error("Invalid email or password.");
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

      if (allEntries.length > 0) {
        await syncEntriesToSheet(allEntries, url, true);
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
        Automatically sync database records to your Google Sheet. When you add or edit a record, it will immediately reflect in the single "All Data" sheet tab, across every category.
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

const QUALIFICATIONS = ["10th Pass", "12th Pass", "Diploma", "Graduate", "Post Graduate", "Other"];

const uploadPersonFile = async (file, path) => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return await getDownloadURL(storageRef);
};

const PersonForm = ({ isMobile, type, parentAdvisorId, requireLogin }) => {
  const collectionName = type === "Employee" ? "employees" : "consultants";
  const displayType = type === "Employee" ? "Employee" : "Advisor";
  const idFieldKey = type === "Employee" ? "employeeId" : "advisorId";
  const initialFormState = { name: "", number: "", email: "", qualification: "", customQualification: "", idNumber: "", loginEmail: "", loginPassword: "" };
  const [form, setForm] = useState(initialFormState);
  const [images, setImages] = useState([]);
  const [pdfs, setPdfs] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const inputStyle = { background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, padding: 10, color: "#1e293b", outline: "none", width: "100%" };
  const labelStyle = { fontSize: 12, color: "#475569", marginBottom: 5, display: "block" };

  const handleAddImages = (e) => {
    const files = Array.from(e.target.files || []);
    setImages(prev => [...prev, ...files]);
    e.target.value = "";
  };
  const handleAddPdfs = (e) => {
    const files = Array.from(e.target.files || []);
    setPdfs(prev => [...prev, ...files]);
    e.target.value = "";
  };
  const handlePhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) setPhotoFile(file);
    e.target.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.number) {
      toast.error("Name and Number are required.");
      return;
    }
    if (requireLogin && (!form.loginEmail || !form.loginPassword)) {
      toast.error("Login Email and Password are required.");
      return;
    }
    setLoading(true);
    try {
      const timestamp = Date.now();
      const imageUrls = await Promise.all(
        images.map((file, i) => uploadPersonFile(file, `dataRecords/${collectionName}/${timestamp}_image_${i}_${file.name}`))
      );
      const pdfUrls = await Promise.all(
        pdfs.map((file, i) => uploadPersonFile(file, `dataRecords/${collectionName}/${timestamp}_pdf_${i}_${file.name}`))
      );
      const photoUrl = photoFile
        ? await uploadPersonFile(photoFile, `dataRecords/${collectionName}/${timestamp}_photo_${photoFile.name}`)
        : "";

      const finalQualification = form.qualification === "Other" ? form.customQualification : form.qualification;

      const profileDocRef = await addDoc(collection(db, collectionName), {
        name: form.name,
        number: form.number,
        email: form.email,
        qualification: finalQualification,
        [idFieldKey]: form.idNumber,
        photoUrl,
        imageUrls,
        pdfUrls,
        ...(parentAdvisorId ? { parentAdvisorId } : {}),
        createdAt: serverTimestamp()
      });

      if (requireLogin) {
        await addDoc(collection(db, "users"), {
          name: form.name,
          email: form.loginEmail,
          phone: form.number,
          password: form.loginPassword,
          role: "SubAdvisor",
          consultantId: profileDocRef.id,
          parentAdvisorId,
          permissions: [],
          createdAt: serverTimestamp()
        });
      }

      toast.success(`${displayType} saved successfully!`);
      setForm(initialFormState);
      setImages([]);
      setPdfs([]);
      setPhotoFile(null);
    } catch (err) {
      toast.error(`Error saving ${displayType.toLowerCase()}: ` + err.message);
    }
    setLoading(false);
  };

  const renderSinglePhoto = (label, file, onAdd, onRemove) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={labelStyle}>{label}</label>
      {file ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 8, gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <img src={URL.createObjectURL(file)} alt="preview" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>{file.name}</div>
              <div style={{ fontSize: 10, color: "#64748b" }}>{(file.size / 1024).toFixed(1)} KB</div>
            </div>
          </div>
          <button type="button" onClick={onRemove} style={{ background: "#fee2e2", border: "none", color: "#ef4444", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, fontWeight: "bold", flexShrink: 0 }}>&times;</button>
        </div>
      ) : (
        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 12px", border: "1px dashed #1e90ff", borderRadius: 8, cursor: "pointer", color: "#1e90ff", fontSize: 13, fontWeight: 700, background: "#f0f9ff" }}>
          <span>+</span> {label}
          <input type="file" accept="image/*" onChange={onAdd} style={{ display: "none" }} />
        </label>
      )}
    </div>
  );

  const renderFileList = (label, files, onAdd, onRemove, accept) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={labelStyle}>{label}</label>
      {files.map((file, idx) => (
        <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 8, gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {file.type?.startsWith("image/") ? (
              <img src={URL.createObjectURL(file)} alt="preview" style={{ width: 36, height: 36, borderRadius: 4, objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 24 }}>📄</span>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>{file.name}</div>
              <div style={{ fontSize: 10, color: "#64748b" }}>{(file.size / 1024).toFixed(1)} KB</div>
            </div>
          </div>
          <button type="button" onClick={() => onRemove(idx)} style={{ background: "#fee2e2", border: "none", color: "#ef4444", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 14, fontWeight: "bold", flexShrink: 0 }}>&times;</button>
        </div>
      ))}
      <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 12px", border: "1px dashed #1e90ff", borderRadius: 8, cursor: "pointer", color: "#1e90ff", fontSize: 13, fontWeight: 700, background: "#f0f9ff" }}>
        <span>+</span> {label}
        <input type="file" accept={accept} multiple onChange={onAdd} style={{ display: "none" }} />
      </label>
    </div>
  );

  return (
    <div>
      <h2 style={{ color: "#1e293b", fontSize: isMobile ? 18 : 20, fontWeight: 800, fontFamily: "'Playfair Display', serif", marginBottom: 16 }}>
        Create {displayType}
      </h2>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? 20 : 32, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
        <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 20 }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="Enter Name" />
          </div>
          <div>
            <label style={labelStyle}>Number</label>
            <input type="tel" value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} style={inputStyle} placeholder="Enter Number" />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} placeholder="Enter Email" />
          </div>
          <div>
            <label style={labelStyle}>{displayType} ID</label>
            <input type="text" value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })} style={inputStyle} placeholder={`Enter ${displayType} ID`} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: form.qualification === "Other" ? 10 : 0 }}>
            <label style={labelStyle}>Qualification</label>
            <select value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} style={inputStyle}>
              <option value="">Select Qualification</option>
              {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
            {form.qualification === "Other" && (
              <input type="text" value={form.customQualification} onChange={e => setForm({ ...form, customQualification: e.target.value })} style={inputStyle} placeholder="Enter Qualification" />
            )}
          </div>

          {requireLogin && (
            <>
              <div>
                <label style={labelStyle}>Login Email</label>
                <input type="email" value={form.loginEmail} onChange={e => setForm({ ...form, loginEmail: e.target.value })} style={inputStyle} placeholder="Email used to log in" />
              </div>
              <div>
                <label style={labelStyle}>Login Password</label>
                <input type="text" value={form.loginPassword} onChange={e => setForm({ ...form, loginPassword: e.target.value })} style={inputStyle} placeholder="Password used to log in" />
              </div>
            </>
          )}

          {renderSinglePhoto(`${displayType} Photo`, photoFile, handlePhotoChange, () => setPhotoFile(null))}
          {renderFileList("Upload Image", images, handleAddImages, (idx) => setImages(prev => prev.filter((_, i) => i !== idx)), "image/*")}
          {renderFileList("Upload PDF", pdfs, handleAddPdfs, (idx) => setPdfs(prev => prev.filter((_, i) => i !== idx)), "application/pdf")}

          <button type="submit" disabled={loading} style={{ gridColumn: "1 / -1", background: "#1e90ff", color: "#fff", border: "none", borderRadius: 8, padding: 16, fontWeight: 700, fontSize: 16, cursor: loading ? "not-allowed" : "pointer", marginTop: 10 }}>
            {loading ? "Uploading & Saving..." : `Save ${displayType}`}
          </button>
        </form>
      </div>
    </div>
  );
};

const PersonList = ({ isMobile, type, parentAdvisorId, topLevelOnly, onSelect }) => {
  const collectionName = type === "Employee" ? "employees" : "consultants";
  const displayType = type === "Employee" ? "Employee" : "Advisor";
  const idFieldKey = type === "Employee" ? "employeeId" : "advisorId";
  const label = type === "Employee" ? "Employees" : "Advisors";
  const [items, setItems] = useState([]);
  const [viewingDocs, setViewingDocs] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editPhotoFile, setEditPhotoFile] = useState(null);
  const [editRemovePhoto, setEditRemovePhoto] = useState(false);
  const [editExistingImages, setEditExistingImages] = useState([]);
  const [editNewImages, setEditNewImages] = useState([]);
  const [editExistingPdfs, setEditExistingPdfs] = useState([]);
  const [editNewPdfs, setEditNewPdfs] = useState([]);

  useEffect(() => {
    const q = parentAdvisorId
      ? query(collection(db, collectionName), where("parentAdvisorId", "==", parentAdvisorId), orderBy("createdAt", "desc"))
      : query(collection(db, collectionName), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(topLevelOnly ? docs.filter(d => !d.parentAdvisorId) : docs);
    });
    return () => unsubscribe();
  }, [collectionName, parentAdvisorId, topLevelOnly]);

  const handleDelete = async (id) => {
    if (window.confirm(`Are you sure you want to delete this ${displayType.toLowerCase()}?`)) {
      try {
        await deleteDoc(doc(db, collectionName, id));
        toast.success(`${displayType} deleted successfully!`);
      } catch (e) {
        toast.error("Error deleting record: " + e.message);
      }
    }
  };

  const openEdit = (item) => {
    const isKnownQualification = QUALIFICATIONS.includes(item.qualification);
    setEditingItem(item);
    setEditForm({
      name: item.name || "",
      number: item.number || "",
      email: item.email || "",
      qualification: item.qualification ? (isKnownQualification ? item.qualification : "Other") : "",
      customQualification: item.qualification && !isKnownQualification ? item.qualification : "",
      idNumber: item[idFieldKey] || "",
    });
    setEditPhotoFile(null);
    setEditRemovePhoto(false);
    setEditExistingImages(item.imageUrls || []);
    setEditNewImages([]);
    setEditExistingPdfs(item.pdfUrls || []);
    setEditNewPdfs([]);
  };

  const closeEdit = () => {
    setEditingItem(null);
    setEditForm(null);
    setEditPhotoFile(null);
    setEditRemovePhoto(false);
    setEditExistingImages([]);
    setEditNewImages([]);
    setEditExistingPdfs([]);
    setEditNewPdfs([]);
  };

  const handleEditAddImages = (e) => {
    const files = Array.from(e.target.files || []);
    setEditNewImages(prev => [...prev, ...files]);
    e.target.value = "";
  };
  const handleEditAddPdfs = (e) => {
    const files = Array.from(e.target.files || []);
    setEditNewPdfs(prev => [...prev, ...files]);
    e.target.value = "";
  };
  const handleEditPhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setEditPhotoFile(file);
      setEditRemovePhoto(false);
    }
    e.target.value = "";
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editForm.name || !editForm.number) {
      toast.error("Name and Number are required.");
      return;
    }
    setEditLoading(true);
    try {
      const timestamp = Date.now();
      const finalQualification = editForm.qualification === "Other" ? editForm.customQualification : editForm.qualification;

      const uploadedImageUrls = await Promise.all(
        editNewImages.map((file, i) => uploadPersonFile(file, `dataRecords/${collectionName}/${timestamp}_image_${i}_${file.name}`))
      );
      const uploadedPdfUrls = await Promise.all(
        editNewPdfs.map((file, i) => uploadPersonFile(file, `dataRecords/${collectionName}/${timestamp}_pdf_${i}_${file.name}`))
      );
      const photoUrl = editPhotoFile
        ? await uploadPersonFile(editPhotoFile, `dataRecords/${collectionName}/${timestamp}_photo_${editPhotoFile.name}`)
        : editRemovePhoto ? "" : (editingItem.photoUrl || "");

      await updateDoc(doc(db, collectionName, editingItem.id), {
        name: editForm.name,
        number: editForm.number,
        email: editForm.email,
        qualification: finalQualification,
        [idFieldKey]: editForm.idNumber,
        photoUrl,
        imageUrls: [...editExistingImages, ...uploadedImageUrls],
        pdfUrls: [...editExistingPdfs, ...uploadedPdfUrls],
      });
      toast.success(`${displayType} updated successfully!`);
      closeEdit();
    } catch (err) {
      toast.error(`Error updating ${displayType.toLowerCase()}: ` + err.message);
    }
    setEditLoading(false);
  };

  return (
    <div>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["SL", "Photo", `${displayType} ID`, "Name", "Number", "Email", "Qualification", "Docs", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 20px", color: "#64748b", fontSize: 11, fontWeight: 700, textAlign: "left", letterSpacing: "1px", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "12px 20px", color: "#475569", fontSize: 13 }}>{idx + 1}</td>
                  <td style={{ padding: "12px 20px" }}>
                    {item.photoUrl ? (
                      <img src={item.photoUrl} alt={item.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                        {type === "Employee" ? "🧑‍💼" : "🧑‍🏫"}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "12px 20px", color: "#475569", fontSize: 13 }}>{item[idFieldKey] || "-"}</td>
                  <td style={{ padding: "12px 20px", color: "#1e293b", fontSize: 13 }}>{item.name}</td>
                  <td style={{ padding: "12px 20px", color: "#475569", fontSize: 13 }}>{item.number}</td>
                  <td style={{ padding: "12px 20px", color: "#475569", fontSize: 13 }}>{item.email}</td>
                  <td style={{ padding: "12px 20px", color: "#475569", fontSize: 13 }}>{item.qualification}</td>
                  <td style={{ padding: "12px 20px" }}>
                    <button
                      onClick={() => setViewingDocs(item)}
                      style={{ background: "#f8fafc", color: "#1e90ff", border: "1px solid #1e90ff", borderRadius: 4, padding: "4px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                    >
                      VIEW DOCS
                    </button>
                  </td>
                  <td style={{ padding: "12px 20px", display: "flex", gap: 6 }}>
                    {onSelect && (
                      <button
                        onClick={() => onSelect(item)}
                        style={{ background: "#1e90ff", color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                      >
                        VIEW
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(item)}
                      style={{ background: "#f8fafc", color: "#16a34a", border: "1px solid #16a34a", borderRadius: 4, padding: "4px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                    >
                      EDIT
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                    >
                      DELETE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {items.length === 0 && (
          <EmptyState icon={type === "Employee" ? "🧑‍💼" : "🧑‍🏫"} title={`No ${label} Found`} subtitle={`Saved ${displayType.toLowerCase()} records will appear here.`} />
        )}
      </div>

      {viewingDocs && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 400, maxHeight: "80vh", overflowY: "auto", position: "relative", border: "1px solid #e2e8f0", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ margin: 0, color: "#1e293b", fontSize: 18, fontWeight: 800 }}>{viewingDocs.name}'s Documents</h3>
                <button onClick={() => setViewingDocs(null)} style={{ background: "transparent", border: "none", color: "#64748b", fontSize: 24, cursor: "pointer" }}>&times;</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {viewingDocs.photoUrl && (
                  <a href={viewingDocs.photoUrl} target="_blank" rel="noreferrer" style={{ color: "#1e90ff", fontSize: 13, fontWeight: 700, textDecoration: "none", background: "#f0f9ff", padding: "12px 16px", borderRadius: 8, border: "1px solid #e0f2fe", textAlign: "center" }}>
                    {type === "Employee" ? "EMPLOYEE PHOTO" : "ADVISOR PHOTO"}
                  </a>
                )}
                {(viewingDocs.imageUrls || []).map((url, i) => (
                  <a key={`img-${i}`} href={url} target="_blank" rel="noreferrer" style={{ color: "#1e90ff", fontSize: 13, fontWeight: 700, textDecoration: "none", background: "#f0f9ff", padding: "12px 16px", borderRadius: 8, border: "1px solid #e0f2fe", textAlign: "center" }}>
                    IMAGE {i + 1}
                  </a>
                ))}
                {(viewingDocs.pdfUrls || []).map((url, i) => (
                  <a key={`pdf-${i}`} href={url} target="_blank" rel="noreferrer" style={{ color: "#1e90ff", fontSize: 13, fontWeight: 700, textDecoration: "none", background: "#f0f9ff", padding: "12px 16px", borderRadius: 8, border: "1px solid #e0f2fe", textAlign: "center" }}>
                    PDF {i + 1}
                  </a>
                ))}
                {!viewingDocs.photoUrl && (!viewingDocs.imageUrls || viewingDocs.imageUrls.length === 0) && (!viewingDocs.pdfUrls || viewingDocs.pdfUrls.length === 0) && (
                  <p style={{ textAlign: "center", color: "#64748b", fontSize: 14 }}>No documents uploaded for this record.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {editingItem && editForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto", position: "relative", border: "1px solid #e2e8f0", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ margin: 0, color: "#1e293b", fontSize: 18, fontWeight: 800 }}>Edit {displayType}</h3>
                <button onClick={closeEdit} style={{ background: "transparent", border: "none", color: "#64748b", fontSize: 24, cursor: "pointer" }}>&times;</button>
              </div>
              <form onSubmit={handleEditSave} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: "#475569", marginBottom: 5, display: "block" }}>Name</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, padding: 10, color: "#1e293b", outline: "none", width: "100%" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#475569", marginBottom: 5, display: "block" }}>Number</label>
                  <input type="tel" value={editForm.number} onChange={e => setEditForm({ ...editForm, number: e.target.value })} style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, padding: 10, color: "#1e293b", outline: "none", width: "100%" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#475569", marginBottom: 5, display: "block" }}>Email</label>
                  <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, padding: 10, color: "#1e293b", outline: "none", width: "100%" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#475569", marginBottom: 5, display: "block" }}>{displayType} ID</label>
                  <input type="text" value={editForm.idNumber} onChange={e => setEditForm({ ...editForm, idNumber: e.target.value })} style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, padding: 10, color: "#1e293b", outline: "none", width: "100%" }} />
                </div>
                <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: editForm.qualification === "Other" ? 10 : 0 }}>
                  <label style={{ fontSize: 12, color: "#475569", marginBottom: 5, display: "block" }}>Qualification</label>
                  <select value={editForm.qualification} onChange={e => setEditForm({ ...editForm, qualification: e.target.value })} style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, padding: 10, color: "#1e293b", outline: "none", width: "100%" }}>
                    <option value="">Select Qualification</option>
                    {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                  {editForm.qualification === "Other" && (
                    <input type="text" value={editForm.customQualification} onChange={e => setEditForm({ ...editForm, customQualification: e.target.value })} style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, padding: 10, color: "#1e293b", outline: "none", width: "100%" }} placeholder="Enter Qualification" />
                  )}
                </div>

                <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 12, color: "#475569", marginBottom: 5, display: "block" }}>{displayType} Photo</label>
                  {editPhotoFile ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 8, gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <img src={URL.createObjectURL(editPhotoFile)} alt="preview" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>{editPhotoFile.name}</div>
                      </div>
                      <button type="button" onClick={() => setEditPhotoFile(null)} style={{ background: "#fee2e2", border: "none", color: "#ef4444", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 14, fontWeight: "bold", flexShrink: 0 }}>&times;</button>
                    </div>
                  ) : (!editRemovePhoto && editingItem.photoUrl) ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 8, gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <img src={editingItem.photoUrl} alt="current" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                        <div style={{ fontSize: 12, color: "#64748b" }}>Current photo</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <label style={{ color: "#1e90ff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                          CHANGE
                          <input type="file" accept="image/*" onChange={handleEditPhotoChange} style={{ display: "none" }} />
                        </label>
                        <button type="button" onClick={() => setEditRemovePhoto(true)} style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>REMOVE</button>
                      </div>
                    </div>
                  ) : (
                    <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 12px", border: "1px dashed #1e90ff", borderRadius: 8, cursor: "pointer", color: "#1e90ff", fontSize: 13, fontWeight: 700, background: "#f0f9ff" }}>
                      <span>+</span> {displayType} Photo
                      <input type="file" accept="image/*" onChange={handleEditPhotoChange} style={{ display: "none" }} />
                    </label>
                  )}
                </div>

                <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 12, color: "#475569", marginBottom: 5, display: "block" }}>Images</label>
                  {editExistingImages.map((url, idx) => (
                    <div key={`existing-img-${idx}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 8, gap: 10 }}>
                      <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#1e90ff", fontWeight: 600, textDecoration: "none" }}>IMAGE {idx + 1}</a>
                      <button type="button" onClick={() => setEditExistingImages(prev => prev.filter((_, i) => i !== idx))} style={{ background: "#fee2e2", border: "none", color: "#ef4444", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 14, fontWeight: "bold", flexShrink: 0 }}>&times;</button>
                    </div>
                  ))}
                  {editNewImages.map((file, idx) => (
                    <div key={`new-img-${idx}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 8, gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <img src={URL.createObjectURL(file)} alt="preview" style={{ width: 36, height: 36, borderRadius: 4, objectFit: "cover" }} />
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>{file.name}</div>
                      </div>
                      <button type="button" onClick={() => setEditNewImages(prev => prev.filter((_, i) => i !== idx))} style={{ background: "#fee2e2", border: "none", color: "#ef4444", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 14, fontWeight: "bold", flexShrink: 0 }}>&times;</button>
                    </div>
                  ))}
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 12px", border: "1px dashed #1e90ff", borderRadius: 8, cursor: "pointer", color: "#1e90ff", fontSize: 13, fontWeight: 700, background: "#f0f9ff" }}>
                    <span>+</span> Upload Image
                    <input type="file" accept="image/*" multiple onChange={handleEditAddImages} style={{ display: "none" }} />
                  </label>
                </div>

                <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 12, color: "#475569", marginBottom: 5, display: "block" }}>PDFs</label>
                  {editExistingPdfs.map((url, idx) => (
                    <div key={`existing-pdf-${idx}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 8, gap: 10 }}>
                      <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#1e90ff", fontWeight: 600, textDecoration: "none" }}>PDF {idx + 1}</a>
                      <button type="button" onClick={() => setEditExistingPdfs(prev => prev.filter((_, i) => i !== idx))} style={{ background: "#fee2e2", border: "none", color: "#ef4444", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 14, fontWeight: "bold", flexShrink: 0 }}>&times;</button>
                    </div>
                  ))}
                  {editNewPdfs.map((file, idx) => (
                    <div key={`new-pdf-${idx}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 8, gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span style={{ fontSize: 24 }}>📄</span>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>{file.name}</div>
                      </div>
                      <button type="button" onClick={() => setEditNewPdfs(prev => prev.filter((_, i) => i !== idx))} style={{ background: "#fee2e2", border: "none", color: "#ef4444", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: 14, fontWeight: "bold", flexShrink: 0 }}>&times;</button>
                    </div>
                  ))}
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 12px", border: "1px dashed #1e90ff", borderRadius: 8, cursor: "pointer", color: "#1e90ff", fontSize: 13, fontWeight: 700, background: "#f0f9ff" }}>
                    <span>+</span> Upload PDF
                    <input type="file" accept="application/pdf" multiple onChange={handleEditAddPdfs} style={{ display: "none" }} />
                  </label>
                </div>

                <button type="submit" disabled={editLoading} style={{ gridColumn: "1 / -1", background: "#1e90ff", color: "#fff", border: "none", borderRadius: 8, padding: 14, fontWeight: 700, fontSize: 14, cursor: editLoading ? "not-allowed" : "pointer", marginTop: 4 }}>
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PageHeader = ({ isMobile, title, subtitle }) => (
  <div style={{ marginBottom: 28 }}>
    <h1 style={{ color: "#1e293b", fontSize: isMobile ? 22 : 26, fontWeight: 800, fontFamily: "'Playfair Display', serif", marginBottom: 6 }}>{title}</h1>
    {subtitle && <p style={{ color: "#64748b", fontSize: 13 }}>{subtitle}</p>}
  </div>
);

const CreateEmployees = ({ isMobile }) => (
  <div>
    <PageHeader isMobile={isMobile} title="Create Employees" subtitle="Add a new employee record" />
    <PersonForm isMobile={isMobile} type="Employee" />
  </div>
);

const EmployeesList = ({ isMobile, title }) => (
  <div>
    <PageHeader isMobile={isMobile} title={title} subtitle="View and manage saved employee records" />
    <PersonList isMobile={isMobile} type="Employee" />
  </div>
);

const CreateAdvisor = ({ isMobile }) => (
  <div>
    <PageHeader isMobile={isMobile} title="Create Advisor" subtitle="Add a new advisor record. Give them a login from Create User." />
    <PersonForm isMobile={isMobile} type="Consultant" />
  </div>
);

const CreateSubAdvisor = ({ isMobile, currentUser }) => (
  <div>
    <PageHeader isMobile={isMobile} title="Create Sub-Advisor" subtitle="Add a sub-advisor under you, with their own login" />
    <PersonForm isMobile={isMobile} type="Consultant" parentAdvisorId={currentUser?.consultantId} requireLogin />
  </div>
);

const DetailRow = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 14, color: "#1e293b", wordBreak: "break-word" }}>{value || "-"}</div>
  </div>
);

const docLinkStyle = { color: "#1e90ff", fontSize: 12, fontWeight: 700, textDecoration: "none", background: "#f0f9ff", padding: "8px 14px", borderRadius: 8, border: "1px solid #e0f2fe" };

const ProfileCard = ({ isMobile, name, badge, photoUrl, rows, imageUrls = [], pdfUrls = [] }) => (
  <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: isMobile ? 20 : 32, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
      {photoUrl ? (
        <img src={photoUrl} alt={name} style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }} />
      ) : (
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>👤</div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", fontFamily: "'Playfair Display', serif" }}>{name || "-"}</div>
        <div style={{ fontSize: 11, color: "#1e90ff", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 4 }}>{badge}</div>
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 20 }}>
      {rows.map(r => <DetailRow key={r.label} label={r.label} value={r.value} />)}
    </div>
    {(imageUrls.length > 0 || pdfUrls.length > 0) && (
      <div style={{ marginTop: 24, borderTop: "1px solid #e2e8f0", paddingTop: 20 }}>
        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 10 }}>Documents</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {imageUrls.map((url, i) => <a key={`img-${i}`} href={url} target="_blank" rel="noreferrer" style={docLinkStyle}>IMAGE {i + 1}</a>)}
          {pdfUrls.map((url, i) => <a key={`pdf-${i}`} href={url} target="_blank" rel="noreferrer" style={docLinkStyle}>PDF {i + 1}</a>)}
        </div>
      </div>
    )}
  </div>
);

const consultantProfile = (person, isMobile, badge) => (
  <ProfileCard
    isMobile={isMobile}
    name={person.name}
    badge={badge}
    photoUrl={person.photoUrl}
    imageUrls={person.imageUrls || []}
    pdfUrls={person.pdfUrls || []}
    rows={[
      { label: "Advisor ID", value: person.advisorId },
      { label: "Number", value: person.number },
      { label: "Email", value: person.email },
      { label: "Qualification", value: person.qualification },
    ]}
  />
);

const Profile = ({ isMobile, currentUser }) => {
  const role = getPanelRole(currentUser);
  const [person, setPerson] = useState(null);
  const consultantId = currentUser?.consultantId;

  useEffect(() => {
    if (!consultantId) return;
    let cancelled = false;
    getDoc(doc(db, "consultants", consultantId))
      .then(snap => { if (!cancelled) setPerson(snap.exists() ? { id: snap.id, ...snap.data() } : null); })
      .catch(e => toast.error("Error loading profile: " + e.message));
    return () => { cancelled = true; };
  }, [consultantId]);

  return (
    <div>
      <PageHeader isMobile={isMobile} title="Profile" subtitle="Your account details" />
      {person ? (
        <ProfileCard
          isMobile={isMobile}
          name={person.name}
          badge={ROLE_LABELS[role]}
          photoUrl={person.photoUrl}
          imageUrls={person.imageUrls || []}
          pdfUrls={person.pdfUrls || []}
          rows={[
            { label: "Advisor ID", value: person.advisorId },
            { label: "Number", value: person.number },
            { label: "Profile Email", value: person.email },
            { label: "Qualification", value: person.qualification },
            { label: "Login Email", value: currentUser.email },
          ]}
        />
      ) : (
        <ProfileCard
          isMobile={isMobile}
          name={currentUser.name}
          badge={ROLE_LABELS[role]}
          rows={[
            { label: "Email", value: currentUser.email },
            { label: "Phone", value: currentUser.phone },
            { label: "Role", value: ROLE_LABELS[role] },
          ]}
        />
      )}
    </div>
  );
};

const TabBar = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
    {tabs.map(t => (
      <button
        key={t.key}
        onClick={() => onChange(t.key)}
        style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: active === t.key ? "#1e90ff" : "#fff", color: active === t.key ? "#fff" : "#475569", cursor: "pointer", fontWeight: 700, fontSize: 13 }}
      >
        {t.label}
      </button>
    ))}
  </div>
);

const AdvisorDetail = ({ isMobile, currentUser, advisor, level, profileLabel, backLabel, onBack }) => {
  const isSubAdvisor = level === "subadvisor";
  const tabs = [
    { key: "profile", label: profileLabel },
    { key: "clients", label: "Client Data" },
    ...(isSubAdvisor ? [] : [{ key: "subs", label: "Sub-Advisor" }]),
  ];
  const [tab, setTab] = useState("profile");

  return (
    <div>
      <button
        onClick={onBack}
        style={{ background: "transparent", border: "none", color: "#1e90ff", fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 12 }}
      >
        ← {backLabel}
      </button>
      <PageHeader isMobile={isMobile} title={advisor.name} subtitle={isSubAdvisor ? "Sub-Advisor" : "Advisor"} />
      <TabBar tabs={tabs} active={tab} onChange={setTab} />
      {tab === "profile" && consultantProfile(advisor, isMobile, isSubAdvisor ? "Sub Advisor" : "Advisor")}
      {tab === "clients" && (
        <UserRecord
          isMobile={isMobile}
          currentUser={currentUser}
          title="Client Data"
          scopeMode={isSubAdvisor ? "subadvisor" : "advisor"}
          scopeId={advisor.id}
        />
      )}
      {tab === "subs" && (
        <AdvisorExplorer
          isMobile={isMobile}
          currentUser={currentUser}
          parentAdvisorId={advisor.id}
          profileLabel="Personal Details"
          listLabel="Sub-Advisors"
        />
      )}
    </div>
  );
};

const AdvisorExplorer = ({ isMobile, currentUser, parentAdvisorId, profileLabel, listLabel }) => {
  const [selected, setSelected] = useState(null);

  if (selected) {
    return (
      <AdvisorDetail
        isMobile={isMobile}
        currentUser={currentUser}
        advisor={selected}
        level={parentAdvisorId ? "subadvisor" : "advisor"}
        profileLabel={profileLabel}
        backLabel={`Back to ${listLabel}`}
        onBack={() => setSelected(null)}
      />
    );
  }
  return (
    <PersonList
      isMobile={isMobile}
      type="Consultant"
      parentAdvisorId={parentAdvisorId}
      topLevelOnly={!parentAdvisorId}
      onSelect={setSelected}
    />
  );
};

const AdvisorData = ({ isMobile, currentUser }) => (
  <div>
    <PageHeader isMobile={isMobile} title="Advisor Data" subtitle="Open an advisor to see their personal details, clients and sub-advisors" />
    <AdvisorExplorer isMobile={isMobile} currentUser={currentUser} profileLabel="Personal Details" listLabel="Advisors" />
  </div>
);

const SubAdvisorData = ({ isMobile, currentUser }) => (
  <div>
    <PageHeader isMobile={isMobile} title="Advisors Data" subtitle="Open a sub-advisor to see their profile and clients" />
    <AdvisorExplorer
      isMobile={isMobile}
      currentUser={currentUser}
      parentAdvisorId={currentUser.consultantId}
      profileLabel="Advisor Profile"
      listLabel="Advisors"
    />
  </div>
);

const PANELS = {
  Admin: {
    title: "Main Admin Panel",
    items: [
      { key: "records", label: "Record Data", icon: "📊" },
      { key: "userrecord", label: "Find Data", icon: "🗂️" },
      { key: "create", label: "Create User", icon: "➕" },
      { key: "users", label: "User Data", icon: "👥" },
      { key: "createAdvisor", label: "Create Advisor", icon: "➕" },
      { key: "advisors", label: "Advisor Data", icon: "🧑‍🏫" },
      { key: "createEmployees", label: "Create Employees", icon: "➕" },
      { key: "employees", label: "Employees Data", icon: "🧑‍💼" },
      { key: "sync", label: "Sync Settings", icon: "⚙️" },
    ],
  },
  DataEntry: {
    title: "Data Entry Panel",
    items: [
      { key: "profile", label: "Profile", icon: "👤" },
      { key: "records", label: "Record Data", icon: "📊" },
      { key: "createEmployees", label: "Create Employees", icon: "➕" },
      { key: "employees", label: "Find Employees", icon: "🔎" },
    ],
  },
  Advisor: {
    title: "Advisor Panel",
    items: [
      { key: "profile", label: "Profile", icon: "👤" },
      { key: "records", label: "Record Data", icon: "📊" },
      { key: "userrecord", label: "Find Data", icon: "🗂️" },
      { key: "createSubAdvisor", label: "Create Sub-Advisor", icon: "➕" },
      { key: "subAdvisors", label: "Advisors Data", icon: "🧑‍🏫" },
    ],
  },
  SubAdvisor: {
    title: "Sub-Advisor Panel",
    items: [
      { key: "profile", label: "Profile", icon: "👤" },
      { key: "records", label: "Record Data", icon: "📊" },
      { key: "userrecord", label: "Find Data", icon: "🗂️" },
    ],
  },
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

  const panelRole = getPanelRole(currentUser);
  const panel = PANELS[panelRole];
  const navItems = panel.items;
  const current = navItems.some(n => n.key === active) ? active : navItems[0].key;
  const isPortalRole = panelRole === "Advisor" || panelRole === "SubAdvisor";
  const missingProfileLink = isPortalRole && !currentUser.consultantId;

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
        display: "flex",
        flexDirection: "column",
      }}>
        <div style={{ padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          {(!collapsed || isMobile) ? <Logo /> : <span style={{ fontSize: 24, fontWeight: 900, color: "#1e90ff" }}>S</span>}
          {isMobile && <button onClick={() => setCollapsed(true)} style={{ background: "transparent", border: "none", color: "#64748b", fontSize: 24, cursor: "pointer" }}>&times;</button>}
        </div>
        {(!collapsed || isMobile) && (
          <div style={{ padding: "0 20px 8px", fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "1px", textTransform: "uppercase" }}>{panel.title}</div>
        )}
        <nav style={{ padding: 10, flex: 1, minHeight: 0, overflowY: "auto" }}>
          {navItems.map(item => (
            <button key={item.key} onClick={() => { setActive(item.key); if (isMobile) setCollapsed(true); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 15px", marginBottom: 5, background: current === item.key ? "#1e90ff11" : "transparent", border: "none", color: current === item.key ? "#1e90ff" : "#64748b", cursor: "pointer", borderRadius: 8, transition: "0.2s" }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span> {(!collapsed || isMobile) && <span style={{ fontWeight: current === item.key ? 700 : 500 }}>{item.label}</span>}
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
              <h2 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{navItems.find(n => n.key === current)?.label}</h2>
           </div>
           <div style={{ textAlign: "right", minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser.name}</div>
                <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>{ROLE_LABELS[panelRole]}</div>
           </div>
        </header>
        <main style={{ flex: 1, padding: isMobile ? 16 : 24, overflowY: "auto", background: "#f8fafc" }}>
          {missingProfileLink && current !== "profile" ? (
            <EmptyState icon="🔗" title="No Profile Linked" subtitle="This login is not linked to an advisor profile yet. Ask an admin to link it." />
          ) : (
            <>
              {current === "profile" && <Profile isMobile={isMobile} currentUser={currentUser} />}
              {current === "records" && <DataRecord isMobile={isMobile} currentUser={currentUser} />}
              {current === "userrecord" && (
                <UserRecord
                  isMobile={isMobile}
                  currentUser={currentUser}
                  title="Find Data"
                  scopeMode={panelRole === "Advisor" ? "advisor" : panelRole === "SubAdvisor" ? "subadvisor" : "admin"}
                />
              )}
              {current === "create" && <CreateUser isMobile={isMobile} />}
              {current === "users" && <AllUsers isMobile={isMobile} users={users} currentUser={currentUser} />}
              {current === "createAdvisor" && <CreateAdvisor isMobile={isMobile} />}
              {current === "advisors" && <AdvisorData isMobile={isMobile} currentUser={currentUser} />}
              {current === "createEmployees" && <CreateEmployees isMobile={isMobile} />}
              {current === "employees" && <EmployeesList isMobile={isMobile} title={navItems.find(n => n.key === "employees").label} />}
              {current === "createSubAdvisor" && <CreateSubAdvisor isMobile={isMobile} currentUser={currentUser} />}
              {current === "subAdvisors" && <SubAdvisorData isMobile={isMobile} currentUser={currentUser} />}
              {current === "sync" && <SyncSettings isMobile={isMobile} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
