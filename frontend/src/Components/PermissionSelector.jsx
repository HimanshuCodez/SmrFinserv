import { getPermissionOptions, hasPermission } from "../utils/permissions";

export default function PermissionSelector({ value, onChange, user, currentUser, disabled = false }) {
  const options = getPermissionOptions(user);
  const grantable = options.filter(option => hasPermission(currentUser, option.key));
  const groups = [...new Set(options.map(option => option.group))];
  const buttonStyle = { background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 10px", fontSize: 12, color: "#1e293b", cursor: "pointer" };

  return (
    <fieldset disabled={disabled} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <legend style={{ color: "#1e293b", fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Permissions</legend>
      <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 12px" }}>Select the sections and actions this user can access.</p>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <button type="button" style={buttonStyle} onClick={() => onChange(grantable.map(option => option.key))}>Select all</button>
        <button type="button" style={buttonStyle} onClick={() => onChange([])}>Clear all</button>
        <span style={{ color: "#64748b", fontSize: 12 }}>{options.filter(option => value.includes(option.key)).length} selected</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 16 }}>
        {groups.map(group => (
          <div key={group}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>{group}</div>
            {options.filter(option => option.group === group).map(option => {
              const allowed = hasPermission(currentUser, option.key);
              return (
                <label key={option.key} style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "8px 0", cursor: allowed ? "pointer" : "not-allowed", opacity: allowed ? 1 : 0.55 }}>
                  <input
                    type="checkbox"
                    name="permissions"
                    value={option.key}
                    checked={value.includes(option.key)}
                    disabled={!allowed}
                    onChange={event => onChange(event.target.checked ? [...value, option.key] : value.filter(key => key !== option.key))}
                    style={{ marginTop: 3, accentColor: "#1e90ff" }}
                  />
                  <span>
                    <span style={{ display: "block", color: "#1e293b", fontSize: 13, fontWeight: 600 }}>{option.label}</span>
                    <span style={{ display: "block", color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>{allowed ? option.description : "You do not have this permission to grant."}</span>
                  </span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
      {getPermissionOptions(user).some(option => option.advisorOnly) && (
        <p style={{ fontSize: 12, color: "#64748b", marginTop: 12 }}>Find Data stays limited to the linked advisor's records. Advisor Data grants access to all advisor profiles and their clients.</p>
      )}
    </fieldset>
  );
}
