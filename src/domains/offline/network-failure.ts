/**
 * True when a server call failed because the browser couldn't reach the server at all (offline),
 * as opposed to the server answering with an error. Never true while rendering on the server.
 */
export function isNetworkFailure(error: unknown) {
  return !import.meta.env.SSR && error instanceof TypeError;
}
