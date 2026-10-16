export const ROLE_LABELS = {
  Admin: "Admin", DataEntry: "Data Entry", Advisor: "Advisor", SubAdvisor: "Sub Advisor", Custom: "Custom Access",
};

export const PERMISSIONS = [
  { key: "profile", label: "Profile", icon: "👤", group: "General", description: "View their own profile." },
  { key: "records", label: "Record Data", icon: "📊", group: "Records", description: "Add insurance and investment records." },
  { key: "userrecord", label: "Find Data", icon: "🗂️", group: "Records", description: "Search, view documents and export accessible records." },
  { key: "editRecords", label: "Edit Records", group: "Records", description: "Update records in Find Data and advisor client lists.", action: true },
  { key: "deleteRecords", label: "Delete Records", group: "Records", description: "Delete records in Find Data and advisor client lists.", action: true },
  { key: "create", label: "Create User", icon: "➕", group: "Users", description: "Create logins and assign permissions they can grant." },
  { key: "users", label: "User Data / Manage Permissions", navLabel: "User Data", icon: "👥", group: "Users", description: "View users, change access and remove accounts within their permissions." },
  { key: "createAdvisor", label: "Create Advisor", icon: "➕", group: "Advisors", description: "Add advisor profiles." },
  { key: "advisors", label: "Advisor Data", icon: "🧑‍🏫", group: "Advisors", description: "View, edit, delete and export all advisor profiles; view their clients." },
  { key: "createSubAdvisor", label: "Create Sub-Advisor", icon: "➕", group: "Advisors", description: "Add sub-advisors under their linked advisor profile.", advisorOnly: true },
  { key: "subAdvisors", label: "Sub-Advisor Data", icon: "🧑‍🏫", group: "Advisors", description: "Manage their linked advisor's sub-advisors and view their clients.", advisorOnly: true },
  { key: "createEmployees", label: "Create Employees", icon: "➕", group: "Employees", description: "Add employee profiles." },
  { key: "employees", label: "Employees Data", icon: "🧑‍💼", group: "Employees", description: "View, edit, delete and export employee profiles." },
  { key: "sync", label: "Sync Settings", icon: "⚙️", group: "Settings", description: "Configure Google Sheets and sync all records." },
];

const permissionKeys = new Set(PERMISSIONS.map(permission => permission.key));
const legacyPermissions = {
  Admin: PERMISSIONS.map(permission => permission.key),
  DataEntry: ["profile", "records", "createEmployees", "employees"],
  Advisor: ["profile", "records", "userrecord", "editRecords", "deleteRecords", "createSubAdvisor", "subAdvisors"],
  SubAdvisor: ["profile", "records", "userrecord", "editRecords", "deleteRecords"],
};

// Roles retain profile ownership; explicit permissions determine dashboard access.
export const getPanelRole = (user) => {
  if (!user) return null;
  if (["User", "Employee", "DataEntry"].includes(user.role)) return "DataEntry";
  return Object.hasOwn(ROLE_LABELS, user.role) ? user.role : "Custom";
};

export const normalizePermissions = permissions => Array.isArray(permissions)
  ? [...new Set(permissions.filter(key => permissionKeys.has(key)))]
  : [];

export const getUserPermissions = (user) => {
  if (!user) return [];
  // An empty or malformed explicit selection must never restore legacy access.
  if (Object.hasOwn(user, "permissions")) return normalizePermissions(user.permissions);
  return [...(legacyPermissions[getPanelRole(user)] || [])];
};

export const hasPermission = (user, permission) => getUserPermissions(user).includes(permission);

export const getPermissionOptions = user => PERMISSIONS.filter(permission =>
  !permission.advisorOnly || (getPanelRole(user) === "Advisor" && Boolean(user.consultantId))
);

export const getNavigationItems = user => getPermissionOptions(user)
  .filter(permission => !permission.action && hasPermission(user, permission.key))
  .map(permission => ({ ...permission, label: permission.navLabel || permission.label }));

export const canGrantPermissions = (actor, permissions) => Array.isArray(permissions)
  && permissions.every(permission => permissionKeys.has(permission) && hasPermission(actor, permission));

export const canManageUser = (actor, target) => Boolean(actor && target?.id)
  && actor.id !== target.id
  && hasPermission(actor, "users")
  && canGrantPermissions(actor, getUserPermissions(target));

export const describePermissions = user => {
  const selected = getUserPermissions(user);
  return getPermissionOptions(user).filter(permission => selected.includes(permission.key)).map(permission => permission.label).join(", ") || "No access";
};
