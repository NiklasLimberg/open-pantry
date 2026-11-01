import { m } from "#/paraglide/messages.js";
import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { organization } from "better-auth/plugins/organization";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { serverEnv } from "#/env.ts";
import { withAdvisoryLock } from "#/db/advisory-lock.ts";
import { db } from "#/db/index.ts";
import * as schema from "#/db/schema.ts";

import { ac, roles } from "#/features/pantry/permissions.ts";

/** Advisory lock key serialising the first sign-up. Any constant works; this one is unique here. */
const firstSignUpLock = 4_101;

export const auth = betterAuth({
  secret: serverEnv().BETTER_AUTH_SECRET,
  baseURL: serverEnv().BETTER_AUTH_URL,
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
          // Two sign-ups racing past the check above both get here. Only the first to take the
          // lock creates the pantry; the other account is removed again.
          const claimed = await withAdvisoryLock(firstSignUpLock, async () => {
            const [existing] = await db
              .select({ id: schema.organization.id })
              .from(schema.organization);
            if (existing) {
              return false;
            }
            await auth.api.createOrganization({
              body: {
                name: "My pantry",
                slug: `pantry-${user.id.toLowerCase()}`,
                userId: user.id,
                timeZone: "Europe/Berlin",
              },
            });
            return true;
          });
          if (!claimed) {
            await db.delete(schema.user).where(eq(schema.user.id, user.id));
            throw new APIError("FORBIDDEN", { message: m["error.signUpClosed"]() });
          }
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
