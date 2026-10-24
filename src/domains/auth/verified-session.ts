import type { getSession } from "#/domains/auth/auth.functions.ts";

type Session = Awaited<ReturnType<typeof getSession>>;

// Set by the first successful check in this tab, so moving between pages doesn't ask the server
// again (and keeps working when it can't be reached). Browser only; the server never uses it.
let verified: Session | undefined;

export const getVerifiedSession = () => verified;
export const setVerifiedSession = (session: Session) => void (verified = session);

/** Call on sign-out so the navigation guard asks the server again. */
export const resetVerifiedSession = () => void (verified = undefined);
