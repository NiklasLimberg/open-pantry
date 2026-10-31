import { m } from "#/paraglide/messages.js";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { organization } from "better-auth/plugins/organization";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { db } from "#/db/index.ts";
import * as schema from "#/db/schema.ts";

import { ac, roles } from "#/domains/pantry/permissions.ts";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true },
  databaseHooks: {
    user: {
      create: {
        // Only the first account can sign up (the owner). Everyone else joins by invitation.
        before: async (_user, ctx) => {
          const existing = await ctx?.context.adapter.count({ model: "user" });
          if (existing !== 0) {
            throw new APIError("FORBIDDEN", {
              message: m["error.signUpClosed"](),
            });
          }
        },
        after: async (user) => {
          await auth.api.createOrganization({
            body: {
              name: "My pantry",
              slug: `pantry-${user.id.toLowerCase()}`,
              userId: user.id,
              timeZone: "Europe/Berlin",
            },
          });
        },
      },
    },
  },
  plugins: [
    organization({
      ac,
      roles,
      creatorRole: "owner",
      schema: {
        organization: {
          additionalFields: {
            timeZone: { type: "string", required: true, defaultValue: "Europe/Berlin" },
          },
        },
      },
    }),
    // Must stay last so it sees cookies set by the other plugins.
    tanstackStartCookies(),
  ],
});
