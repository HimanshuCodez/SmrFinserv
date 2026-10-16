import test from "node:test";
import assert from "node:assert/strict";
import { getUserPermissions, hasPermission, getNavigationItems, getPermissionOptions, canGrantPermissions, canManageUser } from "../src/utils/permissions.js";

test("legacy accounts keep their access before a permission selection is saved", () => {
  for (const role of ["User", "Employee", "DataEntry"]) {
    assert.deepEqual(getUserPermissions({ role }), ["profile", "records", "createEmployees", "employees"]);
  }
  assert.equal(hasPermission({ role: "Admin" }, "users"), true);
  assert.equal(hasPermission({ role: "Advisor" }, "deleteRecords"), true);
  assert.equal(hasPermission({ role: "SubAdvisor" }, "createSubAdvisor"), false);
});

test("explicit selections override every legacy role, including Admin", () => {
  for (const role of ["Admin", "DataEntry", "Advisor", "SubAdvisor"]) {
    const user = { role, permissions: ["employees"] };
    assert.deepEqual(getNavigationItems(user).map(item => item.key), ["employees"]);
    assert.equal(hasPermission(user, "records"), false);
  }
});

test("clearing or corrupting permissions cannot restore role privileges", () => {
  for (const permissions of [[], null, undefined, "Admin", { users: true }]) {
    assert.deepEqual(getUserPermissions({ role: "Admin", permissions }), []);
  }
  assert.deepEqual(getUserPermissions(null), []);
  assert.deepEqual(getUserPermissions({ role: "unrecognized" }), []);
});

test("unknown permissions are ignored and selections are unique", () => {
  assert.deepEqual(getUserPermissions({ permissions: ["users", "users", "madeUp", null] }), ["users"]);
});

test("viewing records does not allow creating, editing, or deleting them", () => {
  const viewer = { permissions: ["userrecord"] };
  assert.equal(hasPermission(viewer, "userrecord"), true);
  for (const action of ["records", "editRecords", "deleteRecords"]) assert.equal(hasPermission(viewer, action), false);
  assert.deepEqual(getNavigationItems({ permissions: ["editRecords", "deleteRecords"] }), []);
});

test("advisor-only sections need a linked top-level advisor", () => {
  const permissions = ["profile", "createSubAdvisor", "subAdvisors"];
  for (const user of [{ role: "Custom" }, { role: "Advisor" }, { role: "SubAdvisor", consultantId: "sub" }]) {
    assert.deepEqual(getNavigationItems({ ...user, permissions }).map(item => item.key), ["profile"]);
  }
  assert.deepEqual(getNavigationItems({ role: "Advisor", consultantId: "a", permissions }).map(item => item.key), permissions);
  assert.equal(getPermissionOptions({ role: "Custom" }).some(option => option.advisorOnly), false);
});

test("delegated account creation cannot grant additional permissions", () => {
  const creator = { permissions: ["create", "records"] };
  assert.equal(canGrantPermissions(creator, ["records"]), true);
  assert.equal(canGrantPermissions(creator, ["users"]), false);
  assert.equal(canGrantPermissions({ role: "Admin" }, ["invented"]), false);
});

test("user management protects self and more privileged accounts", () => {
  const manager = { id: "manager", permissions: ["users", "records"] };
  assert.equal(canManageUser(manager, { id: "entry", permissions: ["records"] }), true);
  assert.equal(canManageUser(manager, { id: "entry", permissions: [] }), true);
  assert.equal(canManageUser(manager, manager), false);
  assert.equal(canManageUser(manager, { id: "admin", role: "Admin" }), false);
  assert.equal(canManageUser({ id: "entry", permissions: ["records"] }, manager), false);
  assert.equal(canManageUser({ role: "Admin" }, { id: "admin", role: "Admin" }), true);
  assert.equal(canManageUser(manager, undefined), false);
});
