import handler from "@tanstack/react-start/server-entry";

import { serverEnv } from "#/env.ts";
import { paraglideMiddleware } from "#/paraglide/server.js";

// Fails at startup, naming the variable, when the environment is incomplete.
serverEnv();

// Resolves the request's language before rendering, so server-rendered text matches the cookie.
export default {
  fetch(request: Request): Promise<Response> {
    return paraglideMiddleware(request, () => handler.fetch(request));
  },
};
