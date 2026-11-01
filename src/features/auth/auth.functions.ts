import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { auth } from "./auth.ts";

export const getSession = createServerFn({ method: "GET" }).handler(() =>
  auth.api.getSession({ headers: getRequestHeaders() }),
);

/** True until the first (owner) account exists. */
export const needsSetup = createServerFn({ method: "GET" }).handler(async () => {
  const ctx = await auth.$context;
  return (await ctx.adapter.count({ model: "user" })) === 0;
});
