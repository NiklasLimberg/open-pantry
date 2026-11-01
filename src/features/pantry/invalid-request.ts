import { setResponseStatus } from "@tanstack/react-start/server";

/** The request was well-formed but names something that doesn't exist or can't be done (400). */
export class InvalidRequestError extends Error {
  constructor(message: string) {
    super(message);
    setResponseStatus(400);
    this.name = "InvalidRequestError";
  }
}
