import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { ac, roles } from "#/domains/pantry/permissions.ts";

export const authClient = createAuthClient({
  plugins: [organizationClient({ ac, roles })],
});
