import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, ownerAc } from "better-auth/plugins/organization/access";

// Shared by server and client. The server is the only place where checks are enforced;
// the client uses them to hide controls.
const statement = {
  ...defaultStatements,
  inventory: ["read", "create", "update", "delete"],
  rule: ["read", "create", "update", "delete"],
  shopping: ["read", "add", "check", "confirm-purchase"],
  productSync: ["read", "run"],
} as const;

export const ac = createAccessControl(statement);

const readPantry = {
  inventory: ["read"],
  rule: ["read"],
  shopping: ["read"],
} as const;

const editPantry = {
  inventory: ["read", "create", "update", "delete"],
  rule: ["read", "create", "update", "delete"],
  shopping: ["read", "add", "check", "confirm-purchase"],
} as const;

const viewer = ac.newRole(readPantry);

/** Changes pantry contents but cannot manage members or the pantry itself. */
const editor = ac.newRole(editPantry);

/** Everything, including members and deleting the pantry. */
const owner = ac.newRole({
  ...ownerAc.statements,
  ...editPantry,
  productSync: ["read", "run"],
});

export const roles = { owner, editor, viewer };

export type PantryRole = keyof typeof roles;

export type Permissions = {
  [K in keyof typeof statement]?: readonly (typeof statement)[K][number][];
};

export function isPantryRole(role: string): role is PantryRole {
  return Object.hasOwn(roles, role);
}

export function roleCan(role: string, permissions: Permissions): boolean {
  return isPantryRole(role) && roles[role].authorize(permissions).success;
}
