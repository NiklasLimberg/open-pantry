import { getRouteApi } from "@tanstack/react-router";

const authed = getRouteApi("/_authed");

/** The current pantry (name, role, time zone, user), loaded once by the signed-in layout. */
export const usePantry = () => authed.useLoaderData();
