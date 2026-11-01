/**
 * True when a server call failed because the browser couldn't reach the server at all (offline),
 * as opposed to the server answering with an error. Never true while rendering on the server.
 */
export function isNetworkFailure(error: unknown) {
  return !import.meta.env.SSR && error instanceof TypeError;
}

/**
 * Text to show for a failed call: the error's own message when the server sent one, otherwise
 * `fallback`. A dropped connection never shows the browser's "Failed to fetch".
 */
export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && !isNetworkFailure(error) ? error.message : fallback;
}
