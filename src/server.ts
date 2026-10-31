import handler from "@tanstack/react-start/server-entry";

import { paraglideMiddleware } from "#/paraglide/server.js";

// Resolves the request's language before rendering, so server-rendered text matches the cookie.
export default {
  fetch(request: Request): Promise<Response> {
    return paraglideMiddleware(request, () => handler.fetch(request));
  },
};
