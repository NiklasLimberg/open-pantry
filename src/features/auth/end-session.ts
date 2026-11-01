import { clearLocalData } from "#/features/offline/persister.ts";

import { resetVerifiedSession } from "./verified-session.ts";

/**
 * Leaves the signed-in screens once the session is gone, whether the user signed out or the
 * server ended it. Removes what this device saved for the account (cached pantry and pages),
 * then reloads so nothing from this visit stays in memory for the next sign-in. Browser only.
 */
export async function endSession() {
  resetVerifiedSession();
  await clearLocalData();
  window.location.assign("/sign-in");
}
